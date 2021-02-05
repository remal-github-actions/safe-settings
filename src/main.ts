import * as core from '@actions/core'
import {context} from '@actions/github'
import {components} from '@octokit/openapi-types/generated/types'
import {RequestError} from '@octokit/request-error'
import Ajv from 'ajv'
import formatsPlugin from 'ajv-formats'
import jsyaml from 'js-yaml'
import json5 from 'json5'
import {newOctokitInstance} from './internal/octokit'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const configPaths = ['yml', 'yaml', 'json', 'json5',].map(ext => `.github/safe-settings.${ext}`)

const githubToken = core.getInput('githubToken', {required: true})
core.setSecret(githubToken)

const settingsRef = core.getInput('settingsRef')

const octokit = newOctokitInstance(githubToken)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const foundFiles: ContentFile[] = (await Promise.all(configPaths.map(configPath =>
            octokit.repos.getContent({
                owner: context.repo.owner,
                repo: context.repo.repo,
                path: configPath,
                ref: settingsRef !== '' ? settingsRef : undefined,
            }).catch(reason => {
                if (reason instanceof RequestError && reason.status === 404) {
                    return null
                }
                throw reason
            })
        )))
            .filter(it => it != null)
            .map(it => it!.data)
            .map(it => it as any as ContentFile)
        for (const foundFile of foundFiles) {
            if (foundFile.type !== 'file') {
                throw new Error(`Not a file: ${foundFile.path}: ${foundFile.type}`)
            }
            if (foundFile.encoding.toLowerCase() !== 'base64') {
                throw new Error(`Incorrect encoding: ${foundFile.path}: ${foundFile.encoding}`)
            }
        }
        if (foundFiles.length === 0) {
            core.warning(`No config files found in the repository:\n  ${configPaths.join("\n  ")}`)
            return
        } else if (foundFiles.length > 1) {
            throw new Error(
                `${foundFiles.length} config files found:\n  ${foundFiles.map(it => it.path).join("\n  ")}`
            )
        }
        const foundFile = foundFiles[0]
        const config = parseConfig(foundFile)
        core.info(JSON.stringify(config, null, 2))

        const ajv = new Ajv({useDefaults: true})
        formatsPlugin(ajv)
        const schema = require('../config.schema.json')
        const validateConfig = ajv.compile(schema)
        if (!validateConfig(config)) {
            core.setFailed(
                `Config validation failed: ${foundFile.download_url}:`
                + `\n  ${validateConfig.errors?.join("\n  ")}`
            )
            return
        }

    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

type ContentFile = components["schemas"]["content-file"]

type ConfigParser = (content: string) => any | null

function getConfigParser(contentFile: ContentFile): ConfigParser {
    const path = contentFile.path
    const lcPath = path.toLowerCase()
    if (lcPath.endsWith('.json')) {
        return JSON.parse
    } else if (lcPath.endsWith('.json5')) {
        return json5.parse
    } else if (lcPath.endsWith('.yml') || lcPath.endsWith('.yaml')) {
        return jsyaml.load
    } else {
        throw new Error(`Unsupported config file extension: ${contentFile.path}`)
    }
}

function parseConfig(contentFile: ContentFile): any | null {
    const parser = getConfigParser(contentFile)
    const content = Buffer.from(contentFile.content, 'base64').toString('utf-8')
    try {
        return parser(content)
    } catch (e) {
        throw new Error(`Error occurred while parsing config file: ${contentFile.download_url}`)
    }
}
