import nox

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "back-end", "sync", "coclib", "db")


@nox.session(python="3.11")
def tests(session: nox.Session) -> None:
    session.install("pytest")
    session.install("-r", "back-end/requirements.txt")
    session.install("-r", "sync/requirements.txt")
    session.run("pytest", "-q")
