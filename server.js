const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const fileDirectory = path.join(__dirname, 'files');
const logFilePath = path.join(__dirname, 'server.log.json');
const createdFilesPath = path.join(__dirname, 'createdFiles.json');


if (!fs.existsSync(fileDirectory)) {
    fs.mkdirSync(fileDirectory);
}

if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '[]'); 
}


if (!fs.existsSync(createdFilesPath)) {
    fs.writeFileSync(createdFilesPath, '[]'); 
}



app.use((req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    };
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return;
        }
        const logs = JSON.parse(data);
        logs.push(logData);
        fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    });
    next();
});

// Routes
app.post('/createFile', (req, res) => {
    const { filename, content, password } = req.body;

    if (!filename || !content || !password) {
        return res.status(400).send('Filename, content, and password are required.');
    }

    const filePath = path.join(fileDirectory, filename);

    if (fs.existsSync(filePath)) {
        return res.status(400).send('File already exists.');
    }

    fs.writeFile(filePath, content, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error creating file.');
        }

        // Add file to created files JSON
        const createdFiles = JSON.parse(fs.readFileSync(createdFilesPath, 'utf8'));
        createdFiles.push({
            filename,
            password,
            created_at: new Date().toISOString()
        });
        fs.writeFileSync(createdFilesPath, JSON.stringify(createdFiles, null, 2));

        res.status(200).send('File created successfully.');
    });
});

app.put('/updateFile', (req, res) => {
    const { filename, content, password } = req.body;

    if (!filename || !content || !password) {
        return res.status(400).send('Filename, content, and password are required.');
    }

    const filePath = path.join(fileDirectory, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(400).send('File not found.');
    }

    const fileData = getFileData(filename);

    if (!fileData) {
        return res.status(500).send('Error retrieving file data.');
    }

    if (fileData.password !== password) {
        return res.status(401).send('Unauthorized access.');
    }

    fs.writeFile(filePath, content, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating file.');
        }
        res.status(200).send('File updated successfully.');
    });
});

app.delete('/deleteFile', (req, res) => {
    const { filename, password } = req.body;

    if (!filename || !password) {
        return res.status(400).send('Filename and password are required.');
    }

    const filePath = path.join(fileDirectory, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(400).send('File not found.');
    }

    const fileData = getFileData(filename);

    if (!fileData) {
        return res.status(500).send('Error retrieving file data.');
    }

    if (fileData.password !== password) {
        return res.status(401).send('Unauthorized access.');
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting file.');
        }

        const createdFiles = JSON.parse(fs.readFileSync(createdFilesPath, 'utf8'));
        const updatedFiles = createdFiles.filter(file => file.filename !== filename);
        fs.writeFileSync(createdFilesPath, JSON.stringify(updatedFiles, null, 2));

        res.status(200).send('File deleted successfully.');
    });
});

app.get('/getFiles', (req, res) => {
    fs.readdir(fileDirectory, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading files.');
        }
        res.json(files);
    });
});

app.get('/getFile', (req, res) => {
    const { filename, password } = req.query;

    if (!filename || !password) {
        return res.status(400).send('Filename and password are required.');
    }

    const fileData = getFileData(filename);

    if (!fileData) {
        return res.status(400).send('File not found.');
    }

    if (fileData.password !== password) {
        return res.status(401).send('Unauthorized access.');
    }

    const filePath = path.join(fileDirectory, filename);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading file.');
        }
        res.send(data);
    });
});
function getFileData(filename) {
    const createdFiles = JSON.parse(fs.readFileSync(createdFilesPath, 'utf8'));
    return createdFiles.find(file => file.filename === filename);
}


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
