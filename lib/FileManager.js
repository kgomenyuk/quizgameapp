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
		 * загрузить буфер на сервер FTP и вернуть уникальный идентификатор файла
		 * также записать новую строку в БД
		 * */
	async uploadFile(buffer, folder, ext, code = "", mimeType = "") {
		try {
			let stream = Readable.from(buffer);
			let fileId = uuid.v4();
			let path = this.directory + folder + "/f" + fileId + ext;
			
			
			//если код не пуст - надо удалить запись из базы данных
			if(code != ""){
				//var filesWithCode = await SELECT.from("pollscanner.Polls.File").where( { code: code } ).columns(['id', 'file_ext']);
				var filesWithCode = await mdb.getFilesByCode(code);

				if(filesWithCode!=null && filesWithCode.length > 0){
					for(const f of filesWithCode){
						const fid = f.id;
						const fext = f.file_ext;
						try{
							await this.client.remove(this.directory + folder + "/f" + fid + fext);
						}catch(exe){
							// ошибка
							console.log(exe);
						}
					}
				}
				// надо удалить запись из БД сначала
				// await DELETE.from("pollscanner.Polls.File", { code: code } );
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
	 * Считать файл из FTP по его идентификатору
	 * */
	async getFile(id) {
		var fileRecord = await mdb.getFileById(id);
		
		if(this.client.closed == true){
			// соединение закрыто. надо открыть
			await this.start();
		}

		if (fileRecord == null) {
			return null;
		} else {
			// файл нашелся в базе данных. теперь надот считать его из FTP
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
	
	async getFile2(id) {
		var fileRecord = await mdb.getFileByCode(id);
		
		if(this.client.closed == true){
			// соединение закрыто. надо открыть
			await this.start();
		}
		

		if (fileRecord == null) {
			return null;
		} else {
			// файл нашелся в базе данных. теперь надот считать его из FTP
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
}

module.exports = {
	FileManager: FileManager
};