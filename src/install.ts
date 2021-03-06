import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import os from "os"
import path from "path"
import { run as setupGo } from "setup-go/lib/main"

import { VersionConfig } from "./version"

const downloadURL = "https://github.com/mrmarble/zmk-viewer/releases/download"

const getAssetURL = (versionConfig: VersionConfig): string => {
    let ext = "tar.gz"
    let platform = os.platform().toString()
    switch (platform) {
        case "win32":
            platform = "windows"
            ext = "zip"
            break
    }
    let arch = os.arch()
    switch (arch) {
        case "x64":
            arch = "amd64"
            break
        case "x32":
        case "ia32":
            arch = "386"
            break
    }
    const noPrefix = versionConfig.TargetVersion.slice(1)

    return `${downloadURL}/${versionConfig.TargetVersion}/zmk-viewer-${noPrefix}-${platform}-${arch}.${ext}`
}

// The installLint returns path to installed binary of zmk-viewer.
export async function installLint(versionConfig: VersionConfig): Promise<string> {
    core.info(`Installing zmk-viewer ${versionConfig.TargetVersion}...`)
    const startedAt = Date.now()
    const assetURL = getAssetURL(versionConfig)
    core.info(`Downloading ${assetURL} ...`)
    const archivePath = await tc.downloadTool(assetURL)
    let extractedDir = ""
    let repl = /\.tar\.gz$/
    if (assetURL.endsWith("zip")) {
        extractedDir = await tc.extractZip(archivePath, process.env.HOME)
        repl = /\.zip$/
    } else {
        // We want to always overwrite files if the local cache already has them
        const args = ["xz"]
        if (process.platform.toString() != "darwin") {
            args.push("--overwrite")
        }
        extractedDir = await tc.extractTar(archivePath, process.env.HOME, args)
    }

    const urlParts = assetURL.split(`/`)
    const dirName = urlParts[urlParts.length - 1].replace(repl, ``)
    const lintPath = path.join(extractedDir, dirName, `zmk-viewer`)
    core.info(`Installed zmk-viewer into ${lintPath} in ${Date.now() - startedAt}ms`)
    return lintPath
}

export async function installGo(): Promise<void> {
    const skipGoInstallation = core.getInput(`skip-go-installation`, { required: false }).trim()
    if (skipGoInstallation.toLowerCase() == "true") {
        core.info(`Skipping the installation of Go`)
        return
    }
    return
    const startedAt = Date.now()
    process.env[`INPUT_GO-VERSION`] = `1`
    await setupGo()
    core.info(`Installed Go in ${Date.now() - startedAt}ms`)
}
