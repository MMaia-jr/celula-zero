#!/usr/bin/env python3

from __future__ import annotations

import fcntl
import os
import re
import stat
import sys
from pathlib import Path


EXIT_ALREADY_RUNNING = 73
EXIT_USAGE = 64
EXIT_NOT_FOUND = 127

KEY_RE = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"
)


def fail_usage(message: str) -> int:
    print(
        f"SINGLE_FLIGHT_ERROR={message}",
        file=sys.stderr,
    )
    print(
        "USAGE=cz-single-flight.py "
        "<key> -- <command> [args...]",
        file=sys.stderr,
    )
    return EXIT_USAGE


def lock_dir() -> Path:
    root = Path.home() / ".celula-zero"

    if root.exists() and root.is_symlink():
        raise RuntimeError("ROOT_IS_SYMLINK")

    root.mkdir(
        mode=0o700,
        exist_ok=True,
    )

    locks = root / "locks"

    if locks.exists() and locks.is_symlink():
        raise RuntimeError("LOCK_DIR_IS_SYMLINK")

    locks.mkdir(
        mode=0o700,
        exist_ok=True,
    )

    os.chmod(
        locks,
        0o700,
    )

    return locks


def acquire(
    key: str,
) -> tuple[int, Path] | None:
    path = lock_dir() / f"{key}.lock"

    flags = (
        os.O_RDWR
        | os.O_CREAT
    )

    # Do not follow a pre-existing symlink where the lock file
    # should be. O_NOFOLLOW is available on the target macOS.
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW

    fd = os.open(
        path,
        flags,
        0o600,
    )

    try:
        observed = os.fstat(fd)

        if not stat.S_ISREG(
            observed.st_mode
        ):
            raise RuntimeError(
                "LOCK_FILE_NOT_REGULAR"
            )

        os.fchmod(
            fd,
            0o600,
        )

        try:
            fcntl.flock(
                fd,
                (
                    fcntl.LOCK_EX
                    | fcntl.LOCK_NB
                ),
            )
        except BlockingIOError:
            os.close(fd)
            return None

        # Python FDs are non-inheritable by default.
        #
        # The lock must survive exec so the real supervisor,
        # not a disposable Python parent, owns the admission.
        os.set_inheritable(
            fd,
            True,
        )

        return fd, path

    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass

        raise


def main(
    argv: list[str],
) -> int:
    if len(argv) < 4:
        return fail_usage(
            "ARGUMENTS_INCOMPLETE"
        )

    key = argv[1]

    if not KEY_RE.fullmatch(key):
        return fail_usage(
            "INVALID_KEY"
        )

    if argv[2] != "--":
        return fail_usage(
            "MISSING_SEPARATOR"
        )

    command = argv[3:]

    if (
        not command
        or not command[0]
    ):
        return fail_usage(
            "COMMAND_MISSING"
        )

    try:
        admission = acquire(key)

    except OSError as exc:
        print(
            "SINGLE_FLIGHT_ERROR="
            f"LOCK_IO:{exc.errno}",
            file=sys.stderr,
        )
        return 74

    except RuntimeError as exc:
        print(
            f"SINGLE_FLIGHT_ERROR={exc}",
            file=sys.stderr,
        )
        return 74

    if admission is None:
        print(
            "SINGLE_FLIGHT=REJECTED "
            f"key={key}",
            flush=True,
        )
        return EXIT_ALREADY_RUNNING

    fd, path = admission

    print(
        "SINGLE_FLIGHT=ADMITTED "
        f"key={key} "
        f"lock={path}",
        flush=True,
    )

    # Important invariant:
    #
    # do NOT spawn a child and remain as a parent.
    # Transform this exact process into the requested command.
    # The inherited FD keeps the kernel flock alive through exec.
    try:
        os.execvpe(
            command[0],
            command,
            os.environ.copy(),
        )

    except FileNotFoundError:
        os.close(fd)

        print(
            "SINGLE_FLIGHT_ERROR="
            "COMMAND_NOT_FOUND",
            file=sys.stderr,
        )

        return EXIT_NOT_FOUND

    except OSError as exc:
        os.close(fd)

        print(
            "SINGLE_FLIGHT_ERROR="
            f"EXEC:{exc.errno}",
            file=sys.stderr,
        )

        return 126


if __name__ == "__main__":
    raise SystemExit(
        main(sys.argv)
    )
