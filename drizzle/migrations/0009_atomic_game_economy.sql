ALTER TABLE public.profiles ADD COLUMN last_catch_result jsonb;

CREATE OR REPLACE FUNCTION public.begin_fishing_cast(
  _user uuid,
  _bait_id text,
  _world_id text,
  _catch_id uuid,
  _fish_id text,
  _kg numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_settings public.app_settings%ROWTYPE;
  v_baits jsonb;
  v_bait_count integer;
  v_utc_day date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
  v_now_ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_pending_ms bigint;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND OR v_profile.banned THEN RAISE EXCEPTION 'account_unavailable'; END IF;
  SELECT * INTO v_settings FROM public.app_settings WHERE id = 1;
  IF NOT FOUND OR v_settings.maintenance THEN RAISE EXCEPTION 'game_unavailable'; END IF;
  IF _bait_id NOT IN ('worm', 'berry', 'premium', 'golden') OR _fish_id = '' OR _world_id = '' OR _kg <= 0 THEN
    RAISE EXCEPTION 'invalid_cast';
  END IF;
  IF v_profile.pending_catch IS NOT NULL THEN
    v_pending_ms := nullif(v_profile.pending_catch->>'at', '')::bigint;
    IF v_pending_ms IS NOT NULL AND v_now_ms - v_pending_ms <= 90000 THEN RAISE EXCEPTION 'catch_in_progress'; END IF;
  END IF;
  IF v_profile.last_catch_at IS NOT NULL AND v_profile.last_catch_at > clock_timestamp() - make_interval(secs => v_settings.catch_cooldown_seconds) THEN
    RAISE EXCEPTION 'cast_cooldown';
  END IF;
  v_bait_count := coalesce(nullif(v_profile.baits->>_bait_id, '')::integer, 0);
  IF v_bait_count <= 0 THEN RAISE EXCEPTION 'out_of_bait'; END IF;
  v_baits := jsonb_set(coalesce(v_profile.baits, '{}'::jsonb), ARRAY[_bait_id], to_jsonb(v_bait_count - 1), true);
  UPDATE public.profiles
  SET baits = v_baits,
      pending_catch = jsonb_build_object('id', _catch_id::text, 'fishId', _fish_id, 'worldId', _world_id, 'kg', _kg, 'at', v_now_ms),
      last_catch_at = clock_timestamp(),
      coins_today = CASE WHEN coins_day = v_utc_day THEN coins_today ELSE 0 END,
      coins_day = v_utc_day,
      ads_today = CASE WHEN coins_day = v_utc_day THEN ads_today ELSE 0 END
  WHERE id = _user;
  RETURN jsonb_build_object('catchId', _catch_id::text, 'baits', v_baits);
END;
$$;
REVOKE ALL ON FUNCTION public.begin_fishing_cast(uuid, text, text, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_fishing_cast(uuid, text, text, uuid, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.settle_fishing_catch(
  _user uuid,
  _catch_id uuid,
  _rarity text,
  _xp_gain integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_settings public.app_settings%ROWTYPE;
  v_fish_id text;
  v_world_id text;
  v_kg numeric;
  v_pending_ms bigint;
  v_age_ms bigint;
  v_utc_day date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
  v_today_coins integer;
  v_base_coins integer;
  v_coins integer;
  v_collection jsonb;
  v_previous jsonb;
  v_previous_best numeric;
  v_count integer;
  v_new_level integer;
  v_new_xp integer;
  v_new_chests jsonb;
  v_tier text;
  v_referral_coins bigint := 0;
  v_result jsonb;
  v_is_new boolean;
  v_is_record boolean;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND OR v_profile.banned THEN RAISE EXCEPTION 'account_unavailable'; END IF;
  IF v_profile.last_catch_result->>'catchId' = _catch_id::text THEN RETURN v_profile.last_catch_result; END IF;
  IF v_profile.pending_catch IS NULL OR v_profile.pending_catch->>'id' IS DISTINCT FROM _catch_id::text THEN
    RAISE EXCEPTION 'catch_not_found';
  END IF;
  v_pending_ms := nullif(v_profile.pending_catch->>'at', '')::bigint;
  v_age_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint - coalesce(v_pending_ms, 0);
  IF v_age_ms < 2500 THEN RAISE EXCEPTION 'catch_too_early'; END IF;
  IF v_age_ms > 90000 THEN
    UPDATE public.profiles SET pending_catch = NULL WHERE id = _user;
    RETURN jsonb_build_object('ok', false, 'error', 'catch_timed_out');
  END IF;
  IF _rarity NOT IN ('common', 'rare', 'epic', 'legendary') OR _xp_gain < 1 OR _xp_gain > 10000 THEN
    RAISE EXCEPTION 'invalid_catch_reward';
  END IF;
  SELECT * INTO v_settings FROM public.app_settings WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'settings_unavailable'; END IF;
  v_fish_id := v_profile.pending_catch->>'fishId';
  v_world_id := v_profile.pending_catch->>'worldId';
  v_kg := (v_profile.pending_catch->>'kg')::numeric;
  v_previous := coalesce(v_profile.collection, '{}'::jsonb)->v_fish_id;
  v_is_new := v_previous IS NULL;
  v_previous_best := coalesce(nullif(v_previous->>'bestKg', '')::numeric, 0);
  v_count := coalesce(nullif(v_previous->>'count', '')::integer, 0);
  v_is_record := NOT v_is_new AND v_kg > v_previous_best;
  v_collection := jsonb_set(coalesce(v_profile.collection, '{}'::jsonb), ARRAY[v_fish_id],
    jsonb_build_object('fishId', v_fish_id, 'count', v_count + 1, 'bestKg', greatest(v_previous_best, v_kg)), true);
  v_today_coins := CASE WHEN v_profile.coins_day = v_utc_day THEN v_profile.coins_today ELSE 0 END;
  v_base_coins := CASE _rarity
    WHEN 'common' THEN v_settings.coins_common
    WHEN 'rare' THEN v_settings.coins_rare
    WHEN 'epic' THEN v_settings.coins_epic
    ELSE v_settings.coins_legendary
  END;
  v_coins := greatest(0, least(v_base_coins, v_settings.daily_coin_cap - v_today_coins));
  v_new_level := v_profile.level;
  v_new_xp := v_profile.xp + _xp_gain;
  v_new_chests := coalesce(v_profile.chests, '[]'::jsonb);
  WHILE v_new_xp >= 100 * v_new_level LOOP
    v_new_xp := v_new_xp - (100 * v_new_level);
    v_new_level := v_new_level + 1;
    v_tier := CASE WHEN v_new_level >= 20 THEN 'epic' WHEN v_new_level >= 10 THEN 'gold' WHEN v_new_level >= 4 THEN 'blue' ELSE 'wood' END;
    v_new_chests := v_new_chests || jsonb_build_array(v_tier);
  END LOOP;
  IF v_coins > 0 THEN
    PERFORM public.add_coins(_user, v_coins, 'catch', jsonb_build_object('fish', v_fish_id, 'kg', v_kg));
  END IF;
  IF v_coins > 0 AND v_profile.referred_by IS NOT NULL THEN
    v_referral_coins := greatest(0, floor(((v_profile.total_earned + v_coins)::numeric * v_settings.referral_percent) / 100)::bigint - v_profile.referral_paid);
    IF v_referral_coins > 0 THEN
      PERFORM public.add_coins(v_profile.referred_by, v_referral_coins, 'referral', jsonb_build_object('from', _user));
      UPDATE public.profiles SET referral_earned = referral_earned + v_referral_coins WHERE id = v_profile.referred_by;
    END IF;
  END IF;
  v_result := jsonb_build_object('ok', true, 'catchId', _catch_id::text, 'coins', v_coins, 'referralCoins', v_referral_coins,
    'capped', v_coins = 0, 'isNew', v_is_new, 'record', v_is_record);
  UPDATE public.profiles
  SET collection = v_collection,
      level = v_new_level,
      xp = v_new_xp,
      chests = v_new_chests,
      pending_catch = NULL,
      coins_today = v_today_coins + v_coins,
      coins_day = v_utc_day,
      total_earned = total_earned + v_coins,
      referral_paid = referral_paid + v_referral_coins,
      last_catch_result = v_result
  WHERE id = _user;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_fishing_catch(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_fishing_catch(uuid, uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_fishing_cast(_user uuid, _catch_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_changed integer;
BEGIN
  UPDATE public.profiles SET pending_catch = NULL
  WHERE id = _user AND pending_catch->>'id' = _catch_id::text;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_fishing_cast(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_fishing_cast(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.open_fishing_chest(_user uuid, _index integer, _expected_tier text, _loot jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_chests jsonb;
  v_baits jsonb;
  v_item jsonb;
  v_bait_id text;
  v_qty integer;
  v_count integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND OR v_profile.banned THEN RAISE EXCEPTION 'account_unavailable'; END IF;
  IF _index < 0 OR jsonb_typeof(v_profile.chests) <> 'array' OR _index >= jsonb_array_length(v_profile.chests) THEN RAISE EXCEPTION 'chest_not_found'; END IF;
  IF v_profile.chests->>_index IS DISTINCT FROM _expected_tier OR _expected_tier NOT IN ('wood', 'blue', 'gold', 'epic') THEN RAISE EXCEPTION 'chest_changed'; END IF;
  IF jsonb_typeof(_loot) <> 'array' OR jsonb_array_length(_loot) < 1 THEN RAISE EXCEPTION 'invalid_chest_loot'; END IF;
  SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) INTO v_chests
  FROM jsonb_array_elements(v_profile.chests) WITH ORDINALITY AS e(value, ordinality)
  WHERE ordinality <> _index + 1;
  v_baits := coalesce(v_profile.baits, '{}'::jsonb);
  FOR v_item IN SELECT value FROM jsonb_array_elements(_loot) AS x(value) LOOP
    v_bait_id := v_item->>'baitId';
    v_qty := nullif(v_item->>'qty', '')::integer;
    IF v_bait_id NOT IN ('worm', 'berry', 'premium', 'golden') OR v_qty IS NULL OR v_qty < 1 OR v_qty > 1000 THEN RAISE EXCEPTION 'invalid_chest_loot'; END IF;
    v_count := coalesce(nullif(v_baits->>v_bait_id, '')::integer, 0);
    v_baits := jsonb_set(v_baits, ARRAY[v_bait_id], to_jsonb(v_count + v_qty), true);
  END LOOP;
  UPDATE public.profiles SET chests = v_chests, baits = v_baits WHERE id = _user;
  RETURN jsonb_build_object('tier', _expected_tier, 'loot', _loot, 'chests', v_chests, 'baits', v_baits);
END;
$$;
REVOKE ALL ON FUNCTION public.open_fishing_chest(uuid, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_fishing_chest(uuid, integer, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.create_fishing_withdrawal(_user uuid, _coins bigint, _address text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_settings public.app_settings%ROWTYPE;
  v_withdrawal_id uuid;
  v_net_coins numeric;
  v_usd numeric(12,2);
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = _user FOR UPDATE;
  IF NOT FOUND OR v_profile.banned THEN RAISE EXCEPTION 'account_unavailable'; END IF;
  SELECT * INTO v_settings FROM public.app_settings WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'settings_unavailable'; END IF;
  IF NOT v_settings.withdrawals_enabled THEN RAISE EXCEPTION 'withdrawals_disabled'; END IF;
  IF _coins < v_settings.min_withdraw_coins THEN RAISE EXCEPTION 'withdrawal_below_minimum'; END IF;
  IF _address !~ '^0x[0-9A-Fa-f]{40}$' THEN RAISE EXCEPTION 'invalid_bep20_address'; END IF;
  IF v_profile.created_at > clock_timestamp() - make_interval(days => v_settings.min_account_days) THEN RAISE EXCEPTION 'account_too_new'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = _user AND status = 'pending') THEN RAISE EXCEPTION 'withdrawal_pending'; END IF;
  IF v_profile.coins < _coins THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  v_net_coins := floor(_coins::numeric * (1 - v_settings.withdraw_fee_percent / 100));
  v_usd := floor((v_net_coins / v_settings.coins_per_usd::numeric) * 100) / 100;
  PERFORM public.add_coins(_user, -_coins, 'withdrawal', jsonb_build_object('address', _address));
  INSERT INTO public.withdrawals (user_id, coins, usd, address, network)
  VALUES (_user, _coins, v_usd, _address, 'BEP20') RETURNING id INTO v_withdrawal_id;
  RETURN jsonb_build_object('ok', true, 'id', v_withdrawal_id, 'usd', v_usd);
END;
$$;
REVOKE ALL ON FUNCTION public.create_fishing_withdrawal(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_fishing_withdrawal(uuid, bigint, text) TO service_role;

CREATE OR REPLACE FUNCTION public.process_fishing_withdrawal(_id uuid, _action text, _tx_hash text, _note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_withdrawal public.withdrawals%ROWTYPE;
BEGIN
  IF _action NOT IN ('paid', 'rejected') THEN RAISE EXCEPTION 'invalid_withdrawal_action'; END IF;
  SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR v_withdrawal.status <> 'pending' THEN RAISE EXCEPTION 'withdrawal_already_processed'; END IF;
  IF _action = 'rejected' THEN
    PERFORM public.add_coins(v_withdrawal.user_id, v_withdrawal.coins, 'withdrawal_refund', jsonb_build_object('withdrawal', _id));
  END IF;
  UPDATE public.withdrawals
  SET status = _action, tx_hash = _tx_hash, admin_note = _note, processed_at = clock_timestamp()
  WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'status', _action);
END;
$$;
REVOKE ALL ON FUNCTION public.process_fishing_withdrawal(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fishing_withdrawal(uuid, text, text, text) TO service_role;