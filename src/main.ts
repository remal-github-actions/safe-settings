import * as core from '@actions/core'
import {context} from '@actions/github'
import {RequestError} from '@octokit/request-error'
import {newOctokitInstance} from './internal/octokit'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const configPaths = ['json', 'json5', 'yaml', 'yml'].map(ext => `.github/safe-settings.${ext}`)

const githubToken = core.getInput('githubToken', {required: true})
core.setSecret(githubToken)

const settingsRef = core.getInput('settingsRef')

const octokit = newOctokitInstance(githubToken)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const foundContents = (await Promise.all(configPaths.map(configPath =>
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
        ))).filter(it => it != null)
        for (const foundContent of foundContents) {
            core.info(JSON.stringify(foundContent))
        }

    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
