import {Gulpclass, Task, SequenceTask, MergedTask} from "gulpclass";

const gulp = require("gulp");
const del = require("del");
const shell = require("gulp-shell");
const replace = require("gulp-replace");
// const mocha = require("gulp-mocha");
// const chai = require("chai");
const tslint = require("gulp-tslint");
const stylish = require("tslint-stylish");
const ts = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");

@Gulpclass()
export class Gulpfile {

    // -------------------------------------------------------------------------
    // General tasks
    // -------------------------------------------------------------------------

    /**
     * Cleans build folder.
     */
    @Task()
    clean(cb: Function) {
        return del(["./build/**"], cb);
    }

    /**
     * Runs typescript files compilation.
     */
    @Task()
    compile() {
        return gulp.src("*.js", { read: false })
            .pipe(shell(["tsc"]));
    }

    // -------------------------------------------------------------------------
    // Packaging and Publishing tasks
    // -------------------------------------------------------------------------

    /**
     * Publishes a package to npm from ./build/package directory.
     */
    @Task()
    npmPublish() {
        return gulp.src("*.js", { read: false })
            .pipe(shell([
                "cd ./build/package && npm publish"
            ]));
    }

    /**
     * Copies all sources to the package directory.
     */
    @MergedTask()
    packageCompile() {
        const tsProject = ts.createProject("tsconfig.json");
        const tsResult = gulp.src(["./src/**/*.ts","typings/**/node/**/*.ts"])
            .pipe(sourcemaps.init())
            .pipe(ts(tsProject));

        return [
            tsResult.dts.pipe(gulp.dest("./build/package")),
            tsResult.js
                .pipe(sourcemaps.write(".", { sourceRoot: "", includeContent: true }))
                .pipe(gulp.dest("./build/package"))
        ];
    }

    /**
     * Moves all compiled files to the final package directory.
     */
    @Task()
    packageMoveCompiledFiles() {
        return gulp.src("./build/package/src/**/*")
            .pipe(gulp.dest("./build/package"));
    }

    /**
     *  Add the html files, otherwise angular complains
     */
    @Task()
    packageCopyResources() {
        return gulp.src(["./src/**/*.html", "./src/**/*.css", "./src/**/*.less"])
            .pipe(gulp.dest("./build/package"));
    }

    /**
     * Moves all compiled files to the final package directory.
     */
    @Task()
    packageClearCompileDirectory(cb: Function) {
        return del([
            "./build/package/src/**"
        ], cb);
    }

    /**
     * Change the "private" state of the packaged package.json file to public.
     */
    @Task()
    packagePreparePackageFile() {
        return gulp.src("./package.json")
            .pipe(replace("\"private\": true,", "\"private\": false,"))
            .pipe(gulp.dest("./build/package"));
    }

    /**
     * This task will replace all typescript code blocks in the README (since npm does not support typescript syntax
     * highlighting) and copy this README file into the package folder.
     */
    @Task()
    packageReadmeFile() {
        return gulp.src("./README.md")
            .pipe(replace(/```typescript([\s\S]*?)```/g, "```javascript$1```"))
            .pipe(gulp.dest("./build/package"));
    }

    /**
     * Creates a package that can be published to npm.
     */
    @SequenceTask()
    package() {
        return [
            "clean",
            "packageCompile",
            "packageMoveCompiledFiles",
            "packageClearCompileDirectory",
            ["packagePreparePackageFile", "packageReadmeFile"]
        ];
    }

    /**
     * Creates a package and publishes it to npm.
     */
    @SequenceTask()
    publish() {
        return ["package", "npmPublish"];
    }

    // -------------------------------------------------------------------------
    // Run tests tasks
    // -------------------------------------------------------------------------

    /**
     * Runs ts linting to validate source code.
     */
    @Task()
    tslint() {
        return gulp.src(["./src/**/*.ts", "./test/**/*.ts", "./sample/**/*.ts"])
            .pipe(tslint())
            .pipe(tslint.report(stylish, {
                emitError: true,
                sort: true,
                bell: true
            }));
    }

    /**
     * Runs unit-tests.
     */
    @Task()
    unit() {
        chai.should();
        chai.use(require("sinon-chai"));
        return gulp.src("./build/es5/test/unit/**/*.js")
            .pipe(mocha());
    }

    /**
     * Compiles the code and runs tests.
     */
    @SequenceTask()
    tests() {
        return ["clean", "compile", "tslint", "unit"];
    }

}