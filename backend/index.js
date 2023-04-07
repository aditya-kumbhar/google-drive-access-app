const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');


//Create express App
const app = express();
app.use(cors());
app.use(express.json())
const server = http.createServer(app);

const port = 4000;

const io = socketio(server, {cors: {origins: '*'}});


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
* Reads previously authorized credentials from the save file.
*
* @return {Promise<OAuth2Client|null>}
*/
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
* Serializes credentials to a file compatible with GoogleAUth.fromJSON.
*
* @param {OAuth2Client} client
* @return {Promise<void>}
*/
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
* Load or request or authorization to call APIs.
*
*/
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
* Lists the names and IDs
* @param {OAuth2Client} authClient An authorized OAuth2 client.
*/
async function listFiles(authClient) {
  const drive = google.drive({version: 'v3', auth: authClient});
  const res = await drive.files.list({
    fields: 'files(id, name)'
  });
  return res.data
}

async function getFileMetadata(realFileId, authClient) {
  
  const service = google.drive({version: 'v3', auth: authClient});
  
  fileId = realFileId;
  try {
    const fileMetadata = await service.files.get({ fileId, fields: 'name, mimeType' });
    return fileMetadata;
  } catch (err) {
    throw err;
  }
}


async function downloadFile(realFileId, authClient) {
  
  const service = google.drive({version: 'v3', auth: authClient});
  
  fileId = realFileId;
  try {
    const file = await service.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'stream' });
    return file;
  } catch (err) {
    throw err;
  }
}


app.get('/', async (req, res) => {
  authClient = await authorize()
  listFiles(authClient).then(data => res.send(data)).catch(error => {
    console.error(error);
    res.status(500).send({ message: 'Unable to list files' });
  });
});

app.post('/download-file', async (req, res) => {
  
  try{
    const fileId = req.body.fileId;
    authClient = await authorize();
    
    fileMetadata = await getFileMetadata(fileId, authClient);
    const fileName = fileMetadata.data.name;
    const mimeType = fileMetadata.data.mimeType;
    
    res.set('Content-disposition', `attachment; filename=${fileName}`);
    res.set('Content-type', mimeType);
    
    authClient = await authorize()
    const fileContent = await downloadFile(fileId, authClient);
    fileContent.data.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Unable to download file' });
  }
  
})


// Get the list of users with access to a file
async function getFileUsers(fileId) {
  const auth = await authorize();
  
  const drive = google.drive({ version: 'v3', auth: auth});
  try{
    const res = await drive.permissions.list({ fileId: fileId, fields: 'permissions(emailAddress,id,role)' });
    const users = res.data.permissions.filter((permission) => permission.emailAddress !== undefined);
    return users;
    
  } catch(err){
    throw err;
  }
  
}

function compareArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return true;
  }
  const emails1 = arr1.map((user) => user.email);
  const emails2 = arr2.map((user) => user.email);
  for (let i = 0; i < emails1.length; i++) {
    if (!emails2.includes(emails1[i])) {
      return true;
    }
  }
  return false;
}

app.post('/file-users', async (req, res) => {
  
  try{
    const fileId = req.body.fileId;
    const socket = io.of(`/${fileId}`);
    
    let usersWithAccess = await getFileUsers(fileId); 
    console.log(usersWithAccess)
    
    
    // Set up a WebSocket connection for the fileId
    socket.on('connection', (socket) => {
      console.log('Client connected to socket!');
    });
    // Periodically check for new/deleted users
    setInterval(async () => {
      const newUsers = await getFileUsers(fileId);
      if (compareArrays(usersWithAccess, newUsers) === true){
        socket.emit('usersChanged', newUsers);
        usersWithAccess = newUsers;
      }
      
    }, 3000);
    // Send the initial list of users to the client
    res.send(usersWithAccess);
    
    
  } catch(error){
    console.error(error);
    res.status(500).send({ message: 'Unable to fetch file permissions' });
    
  }
  
  
});


server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});