import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface GitHubLabel {
    name: string
}

interface PullRequest {
    number: number
    title: string
    labels: GitHubLabel[]
}

// Helper to run shell commands
function runCmd(cmd: string): string | null {
    try {
        return execSync(cmd, { encoding: 'utf8' }).trim()
    } catch (error: any) {
        console.error(`Command failed: ${cmd}`, error.message)
        return null
    }
}

// Helper to extract repo owner and name from remote URL (useful for local testing)
function getRepoFromGit(): string | null {
    const remotes = runCmd('git remote -v')
    if (!remotes) return null
    // Matches git@github.com:owner/repo.git or https://github.com/owner/repo.git
    const match = remotes.match(/github\.com[:/]([^/]+)\/([^.\s]+)/)
    if (match) {
        return `${match[1]}/${match[2]}`
    }
    return null
}

async function main(): Promise<void> {
    const newVersionCode = process.argv[2]
    if (!newVersionCode) {
        console.error('Error: Please provide version code as an argument.')
        process.exit(1)
    }

    const currentTag = process.env.GITHUB_REF_NAME || process.argv[3]
    if (!currentTag) {
        console.error(
            'Error: GITHUB_REF_NAME environment variable is not set and no tag was passed as third argument.',
        )
        process.exit(1)
    }

    const githubToken = process.env.GITHUB_TOKEN
    const githubRepository = process.env.GITHUB_REPOSITORY || getRepoFromGit()
    if (!githubRepository) {
        console.error(
            'Error: GITHUB_REPOSITORY environment variable is not set and could not be inferred.',
        )
        process.exit(1)
    }

    const [owner, repo] = githubRepository.split('/')

    console.log(`Current tag: ${currentTag}`)
    console.log(`Version code: ${newVersionCode}`)
    console.log(`Repository: ${owner}/${repo}`)

    // Find the previous tag
    let prevTag = runCmd(`git describe --tags --abbrev=0 ${currentTag}~1`)
    if (!prevTag) {
        console.log(
            'No previous tag found using git describe. Finding via tag list...',
        )
        const tagsList =
            runCmd(`git tag --sort=-v:refname`)?.split('\n')?.filter(Boolean) ||
            []
        const currentIndex = tagsList.indexOf(currentTag)
        if (currentIndex !== -1 && currentIndex + 1 < tagsList.length) {
            prevTag = tagsList[currentIndex + 1]
        }
    }

    console.log(`Previous tag: ${prevTag || 'None'}`)

    // Get list of commit messages
    const range = prevTag ? `${prevTag}..${currentTag}` : currentTag
    const commits = runCmd(`git log ${range} --oneline`)
    if (!commits) {
        console.log('No commits found in the range.')
        writeChangelog(newVersionCode, [])
        return
    }

    // Extract PR numbers from commit history
    const prNumbers = new Set<number>()
    const lines = commits.split('\n')
    for (const line of lines) {
        const mergeMatch = line.match(/Merge pull request #(\d+)/i)
        if (mergeMatch) {
            prNumbers.add(parseInt(mergeMatch[1], 10))
            continue
        }
        const squashMatch = line.match(/\(#(\d+)\)$/)
        if (squashMatch) {
            prNumbers.add(parseInt(squashMatch[1], 10))
        }
    }

    console.log(`Identified PRs: ${Array.from(prNumbers).join(', ') || 'None'}`)

    if (prNumbers.size === 0) {
        console.log('No PRs found in the commit range.')
        writeChangelog(newVersionCode, [])
        return
    }

    // Fetch details for each PR from the GitHub API
    const prDetails: PullRequest[] = []
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'github-action-changelog-generator',
    }
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`
    } else {
        console.warn(
            'Warning: GITHUB_TOKEN not set. Making unauthenticated API requests.',
        )
    }

    for (const prNumber of prNumbers) {
        try {
            console.log(`Fetching details for PR #${prNumber}...`)
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
                { headers },
            )

            if (!response.ok) {
                console.error(
                    `Failed to fetch PR #${prNumber}: ${response.statusText}`,
                )
                continue
            }

            const data = (await response.json()) as PullRequest
            prDetails.push(data)
        } catch (error: any) {
            console.error(`Error fetching PR #${prNumber}:`, error.message)
        }
    }

    // Filter PRs to only those labeled 'bug' or 'enhancement'
    const filteredPrs = prDetails.filter((pr) => {
        const labels = pr.labels || []
        return labels.some((label) => {
            const name = label.name.toLowerCase()
            return name === 'bug' || name === 'enhancement'
        })
    })

    // Sort PRs so enhancements are listed first, then bugs
    filteredPrs.sort((a, b) => {
        const aIsEnhancement = a.labels.some(
            (l) => l.name.toLowerCase() === 'enhancement',
        )
        const bIsEnhancement = b.labels.some(
            (l) => l.name.toLowerCase() === 'enhancement',
        )
        if (aIsEnhancement && !bIsEnhancement) return -1
        if (!aIsEnhancement && bIsEnhancement) return 1
        return 0
    })

    // Format the changelog entries
    const changelogLines = filteredPrs.map((pr) => {
        const isBug = pr.labels.some((l) => l.name.toLowerCase() === 'bug')
        const prefix = isBug ? 'Fix: ' : 'New: '
        return `- ${prefix}${pr.title} (#${pr.number})`
    })

    writeChangelog(newVersionCode, changelogLines)
}

function writeChangelog(
    baseVersionCodeStr: string,
    changelogLines: string[],
): void {
    const baseVersionCode = parseInt(baseVersionCodeStr, 10)
    if (isNaN(baseVersionCode)) {
        console.error(
            `Error: baseVersionCode "${baseVersionCodeStr}" is not a number.`,
        )
        process.exit(1)
    }

    // F-Droid builds use versionCode suffixes: base * 10 + 1 and base * 10 + 2
    const versionCodes = [baseVersionCode * 10 + 1, baseVersionCode * 10 + 2]

    const generalNote =
        '- General improvements to app stability, dependencies, and code maintenance.'
    let changelogText = ''

    if (changelogLines.length > 0) {
        changelogText = changelogLines.join('\n') + '\n' + generalNote
    } else {
        changelogText = generalNote
    }

    const languages = ['de', 'en-US']
    for (const lang of languages) {
        const dirPath = path.join(
            __dirname,
            '..',
            '..',
            'metadata',
            lang,
            'changelogs',
        )
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }
        for (const vc of versionCodes) {
            const filePath = path.join(dirPath, `${vc}.txt`)
            fs.writeFileSync(filePath, changelogText + '\n', 'utf8')
            console.log(`Successfully wrote changelog to: ${filePath}`)
        }
    }
}

main().catch((err) => {
    console.error('Unhandled error in script:', err)
    process.exit(1)
})
