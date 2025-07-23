import nox

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "back-end", "coclib", "db")


@nox.session(python="3.11")
def tests(session: nox.Session) -> None:
    session.install("pytest")
    session.install("-r", "back-end/requirements.txt")
    session.run("pytest", "-q")
    session.chdir("messages-java")
    session.run("./gradlew", "test", external=True)
    session.chdir("..")
    session.chdir("user_service")
    session.run("./gradlew", "test", external=True)
    session.chdir("..")
    session.run("npm", "--prefix", "front-end", "install", external=True)
    session.run("npm", "--prefix", "front-end", "run", "test", external=True)
    session.run("npm", "--prefix", "front-end", "run", "build", external=True)


