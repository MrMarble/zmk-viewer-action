import * as core from "@actions/core"
import * as github from "@actions/github"
import { exec, ExecOptions } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { dir } from "tmp"
import { promisify } from "util"

import { installGo, installLint } from "./install"
import { findLintVersion } from "./version"

const execShellCommand = promisify(exec)

type ExecRes = {
    stdout: string
    stderr: string
}

const printOutput = (res: ExecRes): void => {
    if (res.stdout) {
        core.info(res.stdout)
    }
    if (res.stderr) {
        core.info(res.stderr)
    }
}

type Env = {
    lintPath: string
}

async function prepareLint(): Promise<string> {
    //const versionConfig = await findLintVersion()
    return await installLint({
        TargetVersion: "v1.0.0",
        AssetURL: "https://github.com/MrMarble/zmk-viewer/releases/download/v1.0.0/zmk-viewer-1.0.0-linux-amd64.tar.gz",
    })
}
async function prepareEnv(): Promise<Env> {
    const startedAt = Date.now()

    // Prepare cache, lint and go in parallel.

    const prepareLintPromise = prepareLint()
    const installGoPromise = installGo()

    const lintPath = await prepareLintPromise
    await installGoPromise

    core.info(`Prepared env in ${Date.now() - startedAt}ms`)
    return { lintPath }
}

async function runLint(lintPath: string): Promise<void> {
    const startedAt = Date.now()
    const res = await execShellCommand(`${lintPath} generate cradio`)
    printOutput(res)

    core.info(`Ran zmk-viewer in ${Date.now() - startedAt}ms`)
}

export async function run(): Promise<void> {
    try {
        const { lintPath } = await core.group(`prepare environment`, prepareEnv)
        core.addPath(path.dirname(lintPath))
        await core.group(`run zmk-viewer`, () => runLint(lintPath))
    } catch (error: any) {
        core.error(`Failed to run: ${error}, ${error.stack}`)
        core.setFailed(error.message)
    }
}
