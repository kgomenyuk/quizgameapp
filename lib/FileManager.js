const {
	Buffer
} = require("buffer");
const ftp = require("basic-ftp");
const {
	Readable,
	Writable
} = require("stream");
const fs = require("fs");
const mdb = require("../db/model");
var uuid = require("uuid");


class FileManager {
	constructor(address, port, directory, username, password) {
		this.address = address;
		this.directory = directory;
		this.username = username;
		this.password = password;
		this.port = port;
		this.client = new ftp.Client();
	}
	async start() {
		try {
			const result = await this.client.access({
				host: this.address,
				user: this.username,
				password: this.password,
				port: this.port 
					//secure: true
			});
			//console.log(await this.client.list());
			return true;
		} catch (err) {
			console.log(err);
			return false;
		}
	}
	setAppCore(core) {}
		/**
		 * upload buffer to the FTP server and generate its unique key
		 * and save it to the database.
		 * If code is specified, then the file will be rewritten
		 * @param {Buffer} buffer Buffer to be saved in a file
		 * @param {String} code Short code of a file. Can be skipped for new upload
		 * @param {String} folder Folder on the server where the file should be stored
		 * */
	async uploadFile(buffer, folder, ext, code = "", mimeType = "") {
		try {
			let stream = Readable.from(buffer);
			let fileId = uuid.v4();
			let path = this.directory + folder + "/f" + fileId + ext;
			
			if(code != ""){
				var filesWithCode = await mdb.getFilesByCode(code);

				if(filesWithCode!=null && filesWithCode.length > 0){
					for(const f of filesWithCode){
						const fid = f.id;
						const fext = f.file_ext;
						try{
							await this.client.remove(this.directory + folder + "/f" + fid + fext);
						}catch(exe){
							console.log(exe);
						}
					}
				}
				await mdb.removeFilesWithCode(code);
			}

			await this.client.uploadFrom(
				stream,
				path
			);
			
			await mdb.addFile({
				id: fileId,
				path,
				code,
				mime_type: mimeType,
				file_ext: ext
			});

			return {
				fileId,
				name: fileId + ext,
				path,
				code,
				mime_type: mimeType,
				file_ext: ext
			};
		} catch (exe) {
			console.log(exe);
			return null;
		}
	}

	/**
	 * get file from FTP by ID
	 * */
	async getFile(id) {
		var fileRecord = await mdb.getFileById(id);
		
		if(this.client.closed == true){
			// is the connection is closed
			await this.start();
		}

		if (fileRecord == null) {
			// not found
			return null;
		} else {
			// file is in the db
			var p = fileRecord.path;
			let chunks = [];
			var stream = new Writable({
				// Implementing write function
				write(chunk, encoding, callback) {
					chunks.push(chunk);
					callback();
				}
			});
			await this.client.downloadTo(stream, p);
			let buffer = Buffer.concat(chunks);
			return buffer;
		}
	}
	
	/**
	 * 
	 * @param {String} code short text ID of a file
	 * @returns {Buffer} file from FTP
	 */
	async getFile2(code) {
		var fileRecord = await mdb.getFileByCode(code);
		
		if(this.client.closed == true){
			await this.start();
		}
		if (fileRecord == null) {
			return null;
		} else {
			var p = fileRecord.path;
			let chunks = [];
			var stream = new Writable({
				write(chunk, encoding, callback) {
					chunks.push(chunk);
					callback();
				}
			});
			await this.client.downloadTo(stream, p);
			let buffer = Buffer.concat(chunks);
			return buffer;
		}
	}
}

module.exports = {
	FileManager: FileManager
};