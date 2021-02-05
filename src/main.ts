import * as core from '@actions/core'
import {context} from '@actions/github'
import {components} from '@octokit/openapi-types/generated/types'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'
import {RequestError} from '@octokit/request-error'
import Ajv from 'ajv'
import formatsPlugin from 'ajv-formats'
import {deepEqual} from 'fast-equals'
import jsyaml from 'js-yaml'
import json5 from 'json5'
import {Config, Details, Issues, Projects, PullRequests, Wikis} from './config.generated'
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
            core.warning(`No config files found in the repository:\n  ${configPaths.join('\n  ')}`)
            return
        } else if (foundFiles.length > 1) {
            throw new Error(
                `${foundFiles.length} config files found:\n  ${foundFiles.map(it => it.path).join('\n  ')}`
            )
        }
        const foundFile = foundFiles[0]
        core.info(`Using config: ${foundFile.download_url}`)
        const untypedConfig = parseConfig(foundFile)
        validateConfig(untypedConfig)
        const config = untypedConfig as Config


        const repo = await octokit.repos.get({owner: context.repo.owner, repo: context.repo.repo}).then(it => it.data)

        const repoPatch: RestEndpointMethodTypes["repos"]["update"]["parameters"] = {
            owner: context.repo.owner,
            repo: context.repo.repo,
        }
        const repoPatchInitialJson = JSON.stringify(repoPatch)


        const processDetails = async (details: Details) => {
            if (details.description != null && details.description !== repo.description) {
                core.info('Updating repository description')
                repoPatch.description = details.description
            }
            if (details.website != null && details.website !== repo.homepage) {
                core.info('Updating repository website')
                repoPatch.homepage = details.website
            }
            if (details.topics != null && !deepEqual(details.topics, repo.topics)) {
                core.info('Updating repository topics')
                await octokit.repos.replaceAllTopics({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    names: details.topics,
                })
            }
        }
        if (config.details != null) {
            await processDetails(config.details)
        }


        const processWikis = async (wikis: Wikis) => {
            if (wikis.enabled != null && wikis.enabled !== repo.has_wiki) {
                if (wikis.enabled) {
                    core.info('Enabling wikis')
                } else {
                    core.info('Disabling wikis')
                }
                repoPatch.has_wiki = wikis.enabled
            }
        }
        if (config.wikis != null) {
            await processWikis(config.wikis)
        }


        const processIssues = async (issues: Issues) => {
            if (issues.enabled != null && issues.enabled !== repo.has_issues) {
                if (issues.enabled) {
                    core.info('Enabling issues')
                } else {
                    core.info('Disabling issues')
                }
                repoPatch.has_issues = issues.enabled
            }
        }
        if (config.issues != null) {
            await processIssues(config.issues)
        }


        const processProjects = async (projects: Projects) => {
            if (projects.enabled != null && projects.enabled !== repo.has_projects) {
                if (projects.enabled) {
                    core.info('Enabling projects')
                } else {
                    core.info('Disabling projects')
                }
                repoPatch.has_projects = projects.enabled
            }
        }
        if (config.projects != null) {
            await processProjects(config.projects)
        }


        const processPullRequests = async (pullRequests: PullRequests) => {
            if (pullRequests.mergeCommitsEnabled != null
                && pullRequests.mergeCommitsEnabled !== repo.allow_merge_commit
            ) {
                if (pullRequests.mergeCommitsEnabled) {
                    core.info('Enabling merge commits')
                } else {
                    core.info('Disabling merge commits')
                }
                repoPatch.allow_merge_commit = pullRequests.mergeCommitsEnabled
            }
            if (pullRequests.squashMergingEnabled != null
                && pullRequests.squashMergingEnabled !== repo.allow_squash_merge
            ) {
                if (pullRequests.squashMergingEnabled) {
                    core.info('Enabling squash merge')
                } else {
                    core.info('Disabling squash merge')
                }
                repoPatch.allow_squash_merge = pullRequests.squashMergingEnabled
            }
            if (pullRequests.rebaseMergingEnabled != null
                && pullRequests.rebaseMergingEnabled !== repo.allow_rebase_merge
            ) {
                if (pullRequests.rebaseMergingEnabled) {
                    core.info('Enabling rebase merge')
                } else {
                    core.info('Disabling rebase merge')
                }
                repoPatch.allow_rebase_merge = pullRequests.rebaseMergingEnabled
            }
            if (pullRequests.automaticBranchDeletionEnabled != null
                && pullRequests.automaticBranchDeletionEnabled !== repo.delete_branch_on_merge
            ) {
                if (pullRequests.automaticBranchDeletionEnabled) {
                    core.info('Enabling automatic branch deletion on merge')
                } else {
                    core.info('Disabling automatic branch deletion on merge')
                }
                repoPatch.delete_branch_on_merge = pullRequests.automaticBranchDeletionEnabled
            }
        }
        if (config.pullRequests != null) {
            await processPullRequests(config.pullRequests)
        }


        if (repoPatchInitialJson !== JSON.stringify(repoPatch)) {
            await octokit.repos.update(repoPatch)
        }

    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

type ContentFile = components['schemas']['content-file']
type ConfigParser = (content: string) => unknown

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

function parseConfig(contentFile: ContentFile): unknown {
    const parser = getConfigParser(contentFile)
    const content = Buffer.from(contentFile.content, 'base64').toString('utf-8')
    try {
        return parser(content)
    } catch (e) {
        throw new Error(`Error occurred while parsing config file: ${contentFile.download_url}`)
    }
}

function validateConfig(config: unknown) {
    const ajv = new Ajv({
        strict: false,
        strictTypes: true,
        strictTuples: true,
        useDefaults: true,
    })

    formatsPlugin(ajv)

    const schema = require('../config.schema.json')
    const validate = ajv.compile(schema)
    if (!validate(config)) {
        throw new Error(
            `Config validation failed:`
            + `\n  ${ajv.errorsText(validate.errors, {separator: '\n  '})}`
        )
    }
}
