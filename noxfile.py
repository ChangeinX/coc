import nox

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "back-end", "coclib", "db")
    for project in ("messages-java", "user_service", "notifications", "recruiting"):
        session.chdir(project)
        session.run("./gradlew", "spotlessCheck", external=True)
        session.chdir("..")


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
    session.chdir("notifications")
    session.run("./gradlew", "test", external=True)
    session.chdir("..")
    session.chdir("recruiting")
    session.run("./gradlew", "test", external=True)
    session.chdir("..")
    session.run("npm", "--prefix", "front-end/app", "install", external=True)
    session.run("npm", "--prefix", "front-end/app", "run", "test", external=True)
    session.run("npm", "--prefix", "front-end/app", "run", "build", external=True)


