## Developing
```sh
$ export REACT_APP_FLASK_SERVER_URL=http://127.0.0.1:5000 # Or wherever your backend server is. I think this will work. i currently am using .env instead of this, so haven't tested yet
$ npm run start
```

## Deploying
`npm run deploy` - pushes a commit to the gh-pages branch which in turn updates the live app on [https://walkersutton.com/cyclemetry](https://walkersutton.com/cyclemetry)
