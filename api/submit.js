const { Octokit } = require("@octokit/rest");
const YAML = require('yaml');
const { v4: uuidv4 } = require('uuid');

let TOKEN = process.env.TOKEN
let REPOSITORY = process.env.REPOSITORY

let [owner, repo] = REPOSITORY.split('/')

module.exports = async (req, res) => {
  let params = req.body

  console.log(params)

  let data = {
    _id: uuidv4(),
    topic: params['fields[topic]'],
    date: params['fields[date]'],
    title: params['fields[title]'],
    significance: params['fields[significance]'],
    event: params['fields[event]'],
    url: params['fields[url]'],
    type: params['fields[type]'],
    image: params['fields[image]'],
    caption: params['fields[caption]'],
    submitTime: +new Date()
  }

  let octokit = new Octokit({ auth: TOKEN })
  let masterRef = await octokit.git.getRef({ owner, repo, ref: 'heads/master'})

  let masterSha = masterRef.data.object.sha

  let branchName = `tmp${+ new Date()}`
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: masterSha})

  let ymlFilename = `${data.date}-entry${data.submitTime}.yml`

  let buffer = new Buffer.from(YAML.stringify(data))
  let base64 = buffer.toString('base64')

  let committer = {
    name: 'Your Name',
    email: 'you@example.com'
  }

  let prTitle = `添加新闻事件-${data.topic}-${data.title}`

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch: branchName,
    path: `_data/comments/${ymlFilename}`,
    message: prTitle,
    content: base64
  })

  let createdPr = await octokit.pulls.create({
    owner,
    repo,
    title: prTitle,
    head: branchName,
    base: 'master'
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  await octokit.pulls.merge({
    owner,
    repo,
    pull_number: createdPr.number,
  })

  await new Promise(resolve => setTimeout(resolve, 500))

  res.setHeader('Location', `https://github.com/${REPOSITORY}/tree/${branchName}`)
//   res.setHeader('Location', createdPr.data.html_url)
  res.status(302).send('')
}
