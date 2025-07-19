import nox

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "back-end", "sync", "messages", "coclib", "db")


@nox.session(python="3.11")
def tests(session: nox.Session) -> None:
    session.install("pytest")
    session.install("-r", "back-end/requirements.txt")
    session.install("-r", "sync/requirements.txt")
    session.install("-r", "messages/requirements.txt")
    session.run("pytest", "-q")
    session.run("npm", "--prefix", "front-end", "install", external=True)
    session.run("npm", "--prefix", "front-end", "run", "test", external=True)
    session.run("npm", "--prefix", "front-end", "run", "build", external=True)


@nox.session(python="3.11")
def smoke(session: nox.Session) -> None:
    """Run a basic socket smoke test for the messages service."""
    session.install("-r", "messages/requirements.txt")
    session.install("websocket-client")
    session.run("python", "tests/smoke_messages.py")
