import nox
from pathlib import Path

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "back-end", "coclib", "db")
    for project in ("messages-java", "user_service", "notifications", "recruiting", "clash-data"):
        # Ensure recruiting has a wrapper JAR (it's missing in the repo).
        if project == "recruiting":
            wrapper_jar = Path("recruiting/gradle/wrapper/gradle-wrapper.jar")
            if not wrapper_jar.exists():
                # Use an existing wrapper to bootstrap recruiting's wrapper.
                session.run("./messages-java/gradlew", "-p", "recruiting", "wrapper", external=True)
        session.chdir(project)
        # Use the project's Gradle Wrapper for consistent builds.
        session.run("./gradlew", "--no-daemon", "spotlessCheck", external=True)
        session.chdir("..")


@nox.session(python="3.11")
def tests(session: nox.Session) -> None:
    session.install("pytest", "pytest-asyncio")
    session.install("-r", "back-end/requirements.txt")
    session.run("pytest", "-q")
    session.chdir("messages-java")
    session.run("./gradlew", "--no-daemon", "test", external=True)
    session.chdir("..")
    session.chdir("user_service")
    session.run("./gradlew", "--no-daemon", "test", external=True)
    session.chdir("..")
    session.chdir("notifications")
    session.run("./gradlew", "--no-daemon", "test", external=True)
    session.chdir("..")
    # Ensure recruiting has a wrapper JAR before running tests.
    wrapper_jar = Path("recruiting/gradle/wrapper/gradle-wrapper.jar")
    if not wrapper_jar.exists():
        session.run("./messages-java/gradlew", "-p", "recruiting", "wrapper", external=True)
    session.chdir("recruiting")
    session.run("./gradlew", "--no-daemon", "test", external=True)
    session.chdir("..")
    session.chdir("clash-data")
    session.run("./gradlew", "--no-daemon", "test", external=True)
    session.chdir("..")
    session.run("npm", "--prefix", "front-end/app", "install", external=True)
    session.run("npm", "--prefix", "front-end/app", "run", "test", external=True)
    session.run("npm", "--prefix", "front-end/app", "run", "build", external=True)
