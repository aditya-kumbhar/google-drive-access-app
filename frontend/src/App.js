import './App.css';
import React, {useState, useEffect} from "react";
import io from 'socket.io-client';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';


function App() {
    const [files, setFiles] = useState(null)
    const baseURL = "http://localhost:4000";
    const [show, setShow] = useState(false);
    const [currentFile, setCurrentFile] = useState("");
    const [userList, setUserList] = useState([]);
    const [socket, setSocket] = useState(null);

    function handleClose(){
        setShow(false);
        if(socket)
            socket.disconnect();
    }

    useEffect(() => {
        fetch(baseURL)
            .then(response => response.json())
            .then(data => setFiles(data.files))
            .catch(error => console.log(error));
    }, []);

    const fetchUsers = async (file) => {
        const response = await fetch(`${baseURL}/file-users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: file.id }),
        });
        const initialUsers = await response.json();
        setUserList(initialUsers);

        // Set up a WebSocket connection for real-time updates
        const newSocket = io(`${baseURL}/${file.id}`);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');

        });
        newSocket.on('usersChanged', (newUserList) => {
            console.log('Users changed')
            setUserList(newUserList);
        });
    };
    function handleFileClick(file) {
        console.log(file.id)
        // function to handle the click event for each file
        setCurrentFile(file);
        fetchUsers(file).then(() => setShow(true))

    }

    function downloadFile() {
        fetch(`${baseURL}/download-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({fileId: currentFile.id})
        })
            .then(response => {
                if (!response.ok) {

                    alert('You do not have permission to download this file')

                    throw new Error('Network response was not ok');
                }
                // Convert the response to a blob
                return response.blob();
            })
            .then(blob => {
                // Create a download link and simulate a click on it to start the download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentFile.name;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(error => {
                console.error('Error downloading file:', error);
            });
    }

    return (
        <>
            <div className="App">
                <h1>List of Files</h1>
                {files ?
                    <ul>
                        {files.map(file => (
                            <li key={file.id} >
                                <button onClick={() => handleFileClick(file)} className="link-button">
                                    {file.name}
                                </button>
                            </li>
                        ))}
                    </ul> : "Loading.."}
            </div>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{currentFile.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>Users having access to this file:</div>
                    <ul>
                        {userList.map(user => (
                            <li key={user.id} >
                                {user.emailAddress} ({user.role})
                            </li>
                        ))}
                    </ul>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={downloadFile}>
                        Download
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default App;
