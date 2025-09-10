import nox
from pathlib import Path

@nox.session(python="3.11")
def lint(session: nox.Session) -> None:
    session.install("ruff")
    session.run("ruff", "check", "coclib", "db")
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
    # If coc-java is available via the coc-py submodule, publish it to mavenLocal
    coc_java_build = Path("coc-py/coc-java/build.gradle")
    if coc_java_build.exists():
        session.chdir("coc-py")
        session.run("./gradlew", ":coc-java:publishToMavenLocal", "-Pversion=0.1.0", "--no-daemon", external=True)
        session.chdir("..")
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
    # Run mobile tests
    session.run("npm", "--prefix", "front-end/mobile", "install", external=True)
    session.run("npm", "--prefix", "front-end/mobile", "run", "test", external=True)
    session.run("npm", "--prefix", "front-end/mobile", "run", "typecheck", external=True)
    session.run("npm", "--prefix", "front-end/mobile", "run", "lint", external=True)
    # Run Lambda tests with their specific requirements
    session.chdir("lambdas/refresh-worker")
    session.install("-r", "requirements-test.txt")
    # Set PYTHONPATH to include coclib for Lambda tests
    session.env["PYTHONPATH"] = "../../"
    session.run("pytest", "test_lambda_function.py", "-v", external=False)
    session.chdir("../..")
