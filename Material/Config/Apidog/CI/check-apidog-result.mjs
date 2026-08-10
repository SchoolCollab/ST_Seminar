import fs from 'node:fs'
import path from 'node:path'

const reportDir = process.argv[2] || 'apidog-reports'
const exitCodePath = process.argv[3] || 'apidog-exit-code.txt'

function fail(message) {
    console.error(`::error::${message}`)
    process.exit(1)
}

function normalize(value) {
    return String(value).replace(/\s+/g, ' ').trim()
}

function getPair(html, label) {
    const pattern = new RegExp(
        `<div class="col-md-4 text-label">${label}</div>\\s*` +
            '<div class="col-md-4">([^<]+)</div>\\s*' +
            '<div class="col-md-4">([^<]+)</div>',
        'm',
    )
    const match = html.match(pattern)
    if (!match) fail(`Could not find Apidog report summary row: ${label}`)
    return [Number(normalize(match[1])), Number(normalize(match[2]))]
}

function getValue(html, label) {
    const pattern = new RegExp(
        `<div class="col-md-4 text-label">${label}</div>\\s*` +
            '<div class="col-md-8">([^<]+)</div>',
        'm',
    )
    const match = html.match(pattern)
    if (!match) fail(`Could not find Apidog report summary value: ${label}`)
    return normalize(match[1])
}

function getPercent(html, label) {
    const value = getValue(html, label)
    const numeric = Number(value.replace('%', ''))
    if (!Number.isFinite(numeric)) {
        fail(`Could not parse Apidog ${label} percentage: ${value}`)
    }
    return numeric
}

if (!fs.existsSync(exitCodePath)) {
    fail(`Missing Apidog CLI exit-code file: ${exitCodePath}`)
}

const apidogExitCode = Number(normalize(fs.readFileSync(exitCodePath, 'utf8')))
if (!Number.isInteger(apidogExitCode)) {
    fail(`Invalid Apidog CLI exit code: ${apidogExitCode}`)
}

if (!fs.existsSync(reportDir)) {
    fail(
        `Apidog CLI exited ${apidogExitCode}, but no report directory was written: ${reportDir}`,
    )
}

const reports = fs
    .readdirSync(reportDir)
    .filter(file => file.endsWith('.html'))
    .map(file => {
        const fullPath = path.join(reportDir, file)
        return { file, fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

if (reports.length === 0) {
    fail(
        `Apidog CLI exited ${apidogExitCode}, but no HTML report was found in ${reportDir}`,
    )
}

const latest = reports[0]
const html = fs.readFileSync(latest.fullPath, 'utf8')
const [httpRequestsExecuted, httpRequestsFailed] = getPair(html, 'Http Requests')
const [assertionsExecuted, assertionsFailed] = getPair(html, 'Assertions')
const runContent = getValue(html, 'Run Content')
const environment = getValue(html, 'Environment')
const untestedPercent = getPercent(html, 'Untested')

console.log(`Apidog CLI exit code: ${apidogExitCode}`)
console.log(`Apidog report parsed: ${latest.fullPath}`)
console.log(`Run content: ${runContent}`)
console.log(`Environment: ${environment}`)
console.log(
    `Http Requests: ${httpRequestsExecuted} executed / ${httpRequestsFailed} failed`,
)
console.log(`Assertions: ${assertionsExecuted} executed / ${assertionsFailed} failed`)
console.log(`Untested: ${untestedPercent.toFixed(2)}%`)

if (untestedPercent !== 0) {
    fail(`Apidog did not execute all tests: Untested is ${untestedPercent.toFixed(2)}%.`)
}

if (httpRequestsExecuted === 0 || assertionsExecuted === 0) {
    fail('Apidog report contains no executed requests or no executed assertions.')
}

if (httpRequestsFailed !== 0 || assertionsFailed !== 0) {
    fail(
        `Apidog suite failed: ${httpRequestsFailed} request(s) and ${assertionsFailed} assertion(s) failed.`,
    )
}

if (apidogExitCode !== 0) {
    fail(
        `Apidog CLI exited ${apidogExitCode} even though the parsed report has no failed requests/assertions.`,
    )
}

console.log('Apidog suite passed: all tests executed and no failures were reported.')
