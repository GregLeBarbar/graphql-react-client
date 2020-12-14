import './App.css';
import React, { Component } from 'react';
import axios from 'axios';

/**
 * Create a new instance of axios with a custom config
 */
const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
  },
});

/**
 * Query to select the 5 latest issues of repository of organization
 */
const GET_ISSUES_OF_REPOSITORY = `
  query ($organization: String!, $repository: String!) {
    organization(login: $organization) {
      name
      url
      avatarUrl
      repository(name: $repository) {
        name
        url
        issues(last: 5) {
          edges {
            node {
              id
              title
              url
            }
          }
        }
      }
    }
  }
`;

/** 
 * Effectue le post graphql dans github (promesse)
 * 
 * @param path qui doit respecter le format "organisation/repository"
 */
const getIssuesOfRepository = path => {
  const [organization, repository] = path.split('/');

  return axiosGitHubGraphQL.post('', { 
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization, repository }, 
  });
}

/**
 * A partir du résulat de la requête, extrait l'organisation (ou les erreurs en cas de problème)
 * @param {*} queryResult 
 */
const resolveIssuesQuery = queryResult => () => ({
  organization: queryResult.data.data.organization,
  errors: queryResult.data.errors,
})


class App extends Component {

  state = {
    path: 'epfl-si/wp-veritas',
    organization: null,
    errors: null,
  };

  componentDidMount() {
    // fetch data
    this.onFetchFromGithub(this.state.path);
  }

  onChange = event => {
    this.setState({ path: event.target.value })
  }

  onSubmit = event => {
    this.onFetchFromGithub(this.state.path);
    event.preventDefault();
  }

  onFetchFromGithub = (path) => {
    getIssuesOfRepository(path).then(queryResult => {
      console.log(queryResult);
      this.setState(resolveIssuesQuery(queryResult))
    });
  }

  render() {

    const TITLE = 'React GrapQL Github Client'
    const { path, organization, errors } = this.state;

    return (
      <div>
        <h1>{TITLE}</h1>
        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com/
          </label>
          <input
            id="url"
            type="text"
            value={path}
            onChange={this.onChange}
            style={{ width: '300px' }}
          />
          <button type="submit">Search</button>
        </form>
        <hr />
        {organization ? (
          <Organization organization={organization} errors={errors} />
        ) : (
          <p>No information yet ...</p>
        )}
      </div>
    );
  }
}

const Organization = ({ organization, errors }) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }
  return (
    <div>
      <p>
        <strong>Issues from Organization:</strong>&nbsp;
        <a href={organization.url}>{organization.name}</a>&nbsp;
        <img src={organization.avatarUrl} width="50" style={{verticalAlign: "middle" }} />
      </p>
      <Repository repository={organization.repository} />
    </div>
  );
};

const Repository = ({ repository }) => (
  <div>
    <p>
      <strong>In Repository:</strong>&nbsp;
      <a href={repository.url}>{repository.name}</a>
    </p>
    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>
        </li>
      ))}
    </ul>
  </div>
);

export default App;