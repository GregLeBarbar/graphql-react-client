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
  query (
    $organization: String!, 
    $repository: String!,
    $cursor: String) {
    organization(login: $organization) {
      name
      url
      avatarUrl
      repository(name: $repository) {
        name
        url
        issues(first: 5,after: $cursor, states: [OPEN]) {
          edges {
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo {
            endCursor
            hasNextPage
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
const getIssuesOfRepository = (path, cursor) => {
  const [organization, repository] = path.split('/');

  return axiosGitHubGraphQL.post('', { 
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization, repository, cursor }, 
  });
}

/**
 * A partir du résulat de la requête, extrait l'organisation (ou les erreurs en cas de problème)
 * @param {*} queryResult 
 */
const resolveIssuesQuery = (queryResult, cursor) => (state) => {
  const { data, errors } = queryResult.data;

  if (!cursor) {
    return {
      organization: data.organization,  
      errors: errors  
    }
  }

  // les anciennes issues sont le state
  // les nouvelles dans le résulat de la requete
  // on merge les issues dans un tableau
  const { edges: oldIssues } = state.organization.repository.issues;
  const { edges: newIssues } = data.organization.repository.issues;
  const updatedIssues = [...oldIssues, ...newIssues];

  // 
  return {
    organization: {
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues,
        },
      },
    },
    errors,
  };
};


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

  onFetchFromGithub = (path, cursor) => {
    getIssuesOfRepository(path, cursor).then(queryResult => {
      console.log(queryResult);
      this.setState(resolveIssuesQuery(queryResult, cursor))
    });
  }

  onFetchMoreIssues = () => {
    const {
      endCursor,
    } = this.state.organization.repository.issues.pageInfo;

    this.onFetchFromGithub(this.state.path, endCursor);
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
          <Organization 
            organization={organization} 
            errors={errors}
            onFetchMoreIssues={this.onFetchMoreIssues}
          />
        ) : (
          <p>No information yet ...</p>
        )}
      </div>
    );
  }
}

const Organization = ({ 
  organization, 
  errors,
  onFetchMoreIssues,
}) => {
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
      <Repository 
        repository={organization.repository}
        onFetchMoreIssues={onFetchMoreIssues}
      />
    </div>
  );
};

const Repository = ({ repository, onFetchMoreIssues }) => (
  <div>
    <p>
      <strong>In Repository:</strong>&nbsp;
      <a href={repository.url}>{repository.name}</a>
    </p>
    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>
          <ReactionsList reactions={issue.node.reactions} />
        </li>
      ))}
    </ul>
    <hr />
    { repository.issues.pageInfo.hasNextPage && (
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
);

const ReactionsList = ({ reactions }) => (
  <ul>
    {reactions.edges.map(reaction => (
      <ReactionItem key={reaction.node.id} reaction={reaction} />
    ))}
  </ul>
)

const ReactionItem = ({reaction}) => (
  <li key={reaction.node.id}>{reaction.node.content}</li>
)

export default App;