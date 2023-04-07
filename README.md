
# Installation

### Prerequisites

Before proceeding with the installation, ensure that the following software is installed on your machine:

-   Node.js (version 18.8.0)
-   npm (version 9.6.4)

### Clone the repository
To get started, clone this repository to your local machine using the following command:
`git clone https://github.com/aditya-kumbhar/google-drive-access-app.git`

### Install dependencies

Navigate to the root directory of the project and install the necessary dependencies for the frontend and backend:
```
cd frontend
npm install
cd backend
npm install
```
# Google Cloud Setup

[This](https://developers.google.com/drive/api/quickstart/nodejs) is the documentation that you need to follow to setup a Google Cloud project and download the credentials.json file that is required to run the Node backend.
You do not need to follow the Node setup instructions as we already have a node backend.

Here is a list of steps that need to be performed:

1. Create a Google Cloud project:  https://developers.google.com/workspace/guides/create-project
2. In the Google Cloud [console](https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com), enable the Google Drive API.
3. Authorize credentials for a desktop application:
	- In the Google Cloud console, go to Menu   >  **APIs & Services**  >  **Credentials**.
	- Click  **Create Credentials**  >  **OAuth client ID**.
	- Click  **Application type**  >  **Desktop app**.
	- In the  **Name**  field, type a name for the credential. This name is only shown in the Google Cloud console.
	- Click  **Create**. The OAuth client created screen appears, showing your new Client ID and Client secret.
	- Click **OK**. The newly created credential appears under **OAuth 2.0 Client IDs**.
	- Save the downloaded JSON file as  `credentials.json`, and move the file in the `backend` directory.
4. Setup OAuth Consent Screen:
  - Detailed instructions: https://developers.google.com/workspace/guides/configure-oauth-consent  
  - In step 4 from the documentation, when adding scopes, add the following scopes from the Google Drive API: `.../auth/drive.metadata.readonly` and `.../auth/drive.readonly`. 
  - In the Test Users section, add the emails of the users who will be testing the application - these are the accounts for which the Google Drive files will be accessed by the application.

# Running the application
 
 ### Start the server
Start the Node.js server in the `backend` directory:
```
node .
```

This will start the server on port `4000`.

### Start the frontend

Start the React frontend:
```
cd ../frontend
npm start
```

# Usage

### Google Drive Authentication
Once the server and frontend are up and running, navigate to `http://localhost:3000` in your browser to access the frontend page.  
When you access this page for the first time, a new tab will open for you to authenticate your Google account - check the Google Drive permissions checkboxes that the app requires and login to your Google account.  

### Downloading files and viewing list of users who have file access

- Once the authentication is done, you can close the new tab. On `http://localhost:3000` you will see the entire list of files in your Google Drive. Each file is a link that opens a modal pop-up.
- The modal contains a Download button using which you can download the file.   
- **Ensure that the file has "anyone with link can view" access in Google Drive, otherwise you will not be able to download the file.**
- The modal also contains a list of users that have access to the file. This list is **realtime**, which means that whenever a user is added or deleted from the file's permissions, the changes will automatically show up in the list without having to refresh the page. 
- The realtime list is achieved using a socket connection between the React client and Node server. The Node server polls the google drive api every 3 seconds using the current fileID to fetch the list of users that have access to the file. Whenever this list differs from the previous list, a socket event is emitted which is then received by the frontend to update its copy of the userList.
