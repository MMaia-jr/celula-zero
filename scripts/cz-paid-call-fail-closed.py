#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


ACCEPTABLE_FINISH_REASONS = {"stop", "tool_calls"}


def validate_response(
    envelope,
    expect_json=False,
    required_keys=None,
):
    reasons = []
    required_keys = set(required_keys or [])

    choices = envelope.get("choices") or []
    if not choices:
        return {
            "accepted": False,
            "reasons": ["NO_CHOICES"],
        }

    choice = choices[0] or {}
    finish_reason = choice.get("finish_reason")
    message = choice.get("message") or {}
    content = message.get("content")

    if finish_reason not in ACCEPTABLE_FINISH_REASONS:
        reasons.append(
            f"UNACCEPTABLE_FINISH_REASON:{finish_reason}"
        )

    if not isinstance(content, str) or not content.strip():
        reasons.append("MISSING_REQUIRED_CONTENT")

    parsed = None

    if expect_json and isinstance(content, str) and content.strip():
        try:
            parsed = json.loads(content)
        except Exception:
            reasons.append("INVALID_REQUIRED_JSON")
        else:
            if not isinstance(parsed, dict):
                reasons.append("JSON_CONTRACT_NOT_OBJECT")

    if required_keys:
        if not isinstance(parsed, dict):
            if "INVALID_REQUIRED_JSON" not in reasons and \
               "JSON_CONTRACT_NOT_OBJECT" not in reasons:
                reasons.append("REQUIRED_KEYS_NOT_CHECKABLE")
        else:
            missing = sorted(
                key for key in required_keys
                if key not in parsed
            )
            if missing:
                reasons.append(
                    "MISSING_REQUIRED_KEYS:" + ",".join(missing)
                )

    return {
        "accepted": len(reasons) == 0,
        "finish_reason": finish_reason,
        "reasons": reasons,
    }


def admit_next_dependent_paid_call(
    previous_validation,
    budget_remaining_usd,
):
    # Budget is necessary, never sufficient.
    if budget_remaining_usd <= 0:
        return False

    return bool(previous_validation.get("accepted"))


def envelope(
    finish_reason,
    content,
    reasoning_tokens=0,
    completion_tokens=0,
):
    return {
        "choices": [{
            "finish_reason": finish_reason,
            "message": {
                "content": content,
                "reasoning": "preserved-elsewhere",
            },
        }],
        "usage": {
            "completion_tokens": completion_tokens,
            "completion_tokens_details": {
                "reasoning_tokens": reasoning_tokens,
            },
        },
    }


def self_test():
    tests = []
    contract = {"role", "pass_or_more"}

    incident = envelope(
        "length",
        "",
        reasoning_tokens=1799,
        completion_tokens=1800,
    )

    v1 = validate_response(
        incident,
        expect_json=True,
        required_keys=contract,
    )
    tests.append(
        ("INCIDENT_LENGTH_EMPTY_REJECTED", not v1["accepted"])
    )

    v2 = validate_response(
        envelope("stop", ""),
        expect_json=True,
        required_keys=contract,
    )
    tests.append(
        ("STOP_EMPTY_REJECTED", not v2["accepted"])
    )

    v3 = validate_response(
        envelope("stop", "not-json"),
        expect_json=True,
        required_keys=contract,
    )
    tests.append(
        ("INVALID_JSON_REJECTED", not v3["accepted"])
    )

    v4 = validate_response(
        envelope("stop", '{"foo":"bar"}'),
        expect_json=True,
        required_keys=contract,
    )
    tests.append(
        ("JSON_MISSING_CONTRACT_KEYS_REJECTED", not v4["accepted"])
    )

    v5 = validate_response(
        envelope(
            "stop",
            '{"role":"product-business",'
            '"pass_or_more":"PASS"}'
        ),
        expect_json=True,
        required_keys=contract,
    )
    tests.append(
        ("VALID_CONTRACT_ACCEPTED", v5["accepted"])
    )

    next_after_failure = admit_next_dependent_paid_call(
        v1,
        budget_remaining_usd=1.9903186,
    )
    tests.append(
        (
            "BUDGET_REMAINING_DOES_NOT_OVERRIDE_FAILURE",
            next_after_failure is False,
        )
    )

    next_after_pass = admit_next_dependent_paid_call(
        v5,
        budget_remaining_usd=1.0,
    )
    tests.append(
        (
            "VALID_PREDECESSOR_CAN_ADMIT_NEXT",
            next_after_pass is True,
        )
    )

    failed = [name for name, ok in tests if not ok]

    print("CZ_PAID_CALL_FAIL_CLOSED_REGRESSION_V2")

    for name, ok in tests:
        print(f"{name}={'PASS' if ok else 'FAIL'}")

    print(f"TOTAL={len(tests)}")
    print(f"FAILED={len(failed)}")
    print("MODEL_CALLS=0")
    print("NETWORK_CALLS=0")
    print("PAID_SPEND_USD=0")

    if failed:
        print("RESULT=FAIL")
        return 2

    print("RESULT=PASS")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("response", nargs="?")
    ap.add_argument("--expect-json", action="store_true")
    ap.add_argument(
        "--require-key",
        action="append",
        default=[],
    )
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        raise SystemExit(self_test())

    if not args.response:
        ap.error(
            "response JSON path required unless --self-test"
        )

    data = json.loads(
        Path(args.response).read_text(encoding="utf-8")
    )

    result = validate_response(
        data,
        expect_json=args.expect_json,
        required_keys=args.require_key,
    )

    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        )
    )

    raise SystemExit(
        0 if result["accepted"] else 2
    )


if __name__ == "__main__":
    main()
