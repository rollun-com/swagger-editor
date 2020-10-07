import React                   from "react"
import PropTypes               from "prop-types"
import _                       from "lodash"
import {REPO_NAME, REPO_OWNER} from "./manifests-list"
import {Octokit}               from "@octokit/core"

export default class SaveManifest extends React.Component {

  state = {
    isOpen: false
  }

  togglePanel() {
    this.setState(({isOpen}) => ({isOpen: !isOpen}))
  }

  static propTypes = {
    sidepanelSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired
  }

  componentDidMount() {
    this.githubOctokit = new Octokit({
      auth: this.props.sidepanelSelectors.getGithubAuthToken()
    })
  }

  getFileNameFromTitle(title, version) {
    return `${_.snakeCase(title)}__v${version}.yml`
  }

  async handleFormSubmit(e, fileName) {
    e.preventDefault()
    const form = new FormData(e.target)
    const saveMode = form.get("save-mode")
    if (saveMode === "-") {
      return alert(`Select save mode first!`)
    }
    const branch = saveMode === "production" ? "master" : "develop"

    const {data} = await this.githubOctokit.request("GET /repos/:owner/:repo/contents/:path?ref=" + branch, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: fileName,
      headers: {
        // force disable cache
        "If-None-Match": ""
      }
    })
      .catch(() => ({data: null}))

    await this.githubOctokit.request("PUT /repos/:owner/:repo/contents/:path", {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: fileName,
      message: prompt(`Optional: enter commit message`) || `Update ${fileName}`,
      branch,
      content: btoa(this.props.specSelectors.specStr().toString()),
      ...(data && {sha: data.sha})
    })
    this.togglePanel()
  }

  saveManifest() {

  }

  render() {
    // const {getComponent} = this.props
    const {isOpen} = this.state

    if (!isOpen) {

      return <button className='button save-manifest-toggle'
                     onClick={() => this.togglePanel()}>
        Save current manifest
      </button>
    }

    const {title = "", version = ""} = this.props.specSelectors.info().toJS()

    const fileName = this.getFileNameFromTitle(title, version)
    return <div className='manifests-modal small-modal'>
      <section className='d-flex between section'>
        <h1 className='header'>Save OpenAPI Manifest to <a href="https://github.com/rollun-com/openapi-manifests" target='_blank'>git repo</a></h1>
        <button className='button'
                style={{margin: "10px"}}
                onClick={() => this.togglePanel()}>
          Close
        </button>
      </section>
      <section className='section'>
        {title && version
          ? <div><h2>Current manifest name (generated from info.title):</h2><h2>{fileName}</h2></div>
          : <h2 style={{color: "red"}}>Title and version field is required.</h2>}
        <form style={{fontSize: "1rem"}} onSubmit={e => this.handleFormSubmit(e, fileName)}>
          Save current manifest as
          <select name='save-mode' style={{margin: "0 10px"}}>
            <option value="-">--- Select mode ---</option>
            <option value="production">Production ready</option>
            <option value="draft">Draft</option>
          </select>
          <section>
            <button style={{marginTop: 10}}
                    type='submit'
                    className='button'>
              Save
            </button>
          </section>
        </form>
      </section>
    </div>
  }
}
