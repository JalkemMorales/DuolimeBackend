const xml2js = require('xml2js');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

class FileHandler {

    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.secretKey = crypto.createHash('sha256').update('mi-secreta-clave').digest();
    }

    // Método para encriptar el archivo XML
    async encryptFile() {
        try {
            this.filesPath = this.file + '.xml';
            this.encryptedPath = this.file + '.enc';
            const data = await fs.readFile(this.filesPath, 'utf-8');

            // Generar un IV único para esta operación de cifrado
            const iv = crypto.randomBytes(16);

            const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
            let encrypted = cipher.update(data, 'utf-8', 'hex');
            encrypted += cipher.final('hex');

            // Guardar el IV y el contenido encriptado en el archivo
            await fs.writeFile(this.encryptedPath, iv.toString('hex') + ':' + encrypted);
            await fs.unlink(this.filesPath);
        } catch (err) {
            console.error('Error al encriptar el archivo:', err);
        }
    }

    // Método para desencriptar el archivo XML
    async decryptFile() {
        try {
            this.filePath = this.file + '.xml';
            this.encryptedPath = this.file + '.enc';
            const encryptedData = await fs.readFile(this.encryptedPath, 'utf-8');
            const [ivHex, encryptedContent] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
            let decrypted = decipher.update(encryptedContent, 'hex', 'utf-8');
            decrypted += decipher.final('utf-8');

            await fs.writeFile(this.filePath, decrypted);
            console.log('Archivo desencriptado y guardado como:', this.filePath);
        } catch (err) {
            console.error('Error al desencriptar el archivo:', err);
        }
    }

    async writePerfil(username, password) {
        this.file = 'perfil';
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
        try {
            // Si existe el archivo encriptado, desencriptarlo primero
            try {
                await fs.access(this.encryptedPath);
                console.log('Archivo encriptado encontrado. Desencriptando...');
                await this.decryptFile();
            } catch {
                console.log('No se encontró archivo encriptado. Se creará un nuevo perfil.');
            }

            let usersData;

            // Comprobar si el archivo XML existe y leer su contenido
            try {
                const xmlData = await fs.readFile(this.filePath, 'utf-8');
                usersData = await xml2js.parseStringPromise(xmlData);
            } catch {
                // Si no existe el archivo XML, crear una estructura inicial
                usersData = { users: { user: [] } };
            }

            // Obtener el último ID y calcular el nuevo ID
            let newId = 1;
            if (usersData.users.user && usersData.users.user.length > 0) {
                const ids = usersData.users.user.map(u => parseInt(u.$.id, 10));
                newId = Math.max(...ids) + 1;
            }

            const newUser = {
                $: { id: newId.toString() },
                username: [username],
                password: [password],
            };

            usersData.users.user.push(newUser);

            // Convertir el objeto de nuevo a XML
            const builder = new xml2js.Builder();
            const newXml = builder.buildObject(usersData);

            // Guardar el nuevo XML en el archivo
            await fs.writeFile(this.filePath, newXml);
            console.log(`Nuevo usuario añadido con ID ${newId} y archivo XML actualizado:`, this.filePath);

            // Encriptar el archivo XML después de actualizarlo
            await this.encryptFile();
        } catch (err) {
            console.error('Error al escribir en el perfil:', err);
        }
    }

    async readPerfil(username, password) {
        this.file = 'perfil';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            const users = result.users.user;
            const user = users.find(u => u.username[0] === username && u.password[0] === password);
            if (user) {
                return user.$.id;
            } else {
                return null;
            }
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    async readCategories() {
        this.file = 'categoria';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            return result.categories.category;
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }
}

module.exports = FileHandler;
