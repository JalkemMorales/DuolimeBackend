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
            //await fs.unlink(this.filesPath);
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
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            const users = result.users.user;
            const user = users.find(u => u.username[0] === username && u.password[0] === password);
            if (user) {
                return user;
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
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
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

    async readPuntaje(id, categoria) {
        this.file = 'puntaje';
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            const users = result.scores.user;
            const user = users.find(u => u.$.id === id);
            const puntaje = user.category.find(u => u.name[0] === categoria);
            if (puntaje) {
                return puntaje.score[0];
            } else {
                return null;
            }
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    async readProgreso(id, categoria) {
        this.file = 'progreso';
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            const users = result.progress.user;
            const user = users.find(u => u.$.id === id);
            const progress = user.category.find(u => u.name[0] === categoria);
            if (progress) {
                return progress.level[0];
            } else {
                await this.writeProgress(id, categoria, 1);
                return '1';
            }
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    async writeProgress(id, category, newlevel) {
        this.file = 'progreso';
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
                usersData = { progress: { user: [] } };
            }
    
            // Buscar el usuario por ID
            let user = usersData.progress.user.find(u => u.$.id === id);
    
            if (!user) {
                // Si el usuario no existe, crear uno nuevo con la categoría y nivel inicial
                user = {
                    $: { id: id },
                    category: [
                        { name: [category], level: [newlevel.toString()] }
                    ]
                };
                usersData.progress.user.push(user);
            } else {
                // Buscar la categoría dentro del usuario
                let categoryEntry = user.category.find(c => c.name[0] === category);
    
                if (!categoryEntry) {
                    // Si la categoría no existe, añadirla con el nuevo nivel
                    categoryEntry = { name: [category], level: [newlevel.toString()] };
                    user.category.push(categoryEntry);
                } else {
                    // Si la categoría ya existe, actualizar el nivel
                    categoryEntry.level[0] = newlevel.toString();
                }
            }
    
            // Convertir el objeto de nuevo a XML
            const builder = new xml2js.Builder();
            const newXml = builder.buildObject(usersData);
    
            // Guardar el nuevo XML en el archivo
            await fs.writeFile(this.filePath, newXml);
            console.log(`Progreso actualizado para el usuario con ID ${id} en la categoría '${category}'.`);
    
            // Encriptar el archivo XML después de actualizarlo
            await this.encryptFile();
        } catch (err) {
            console.error('Error al escribir el progreso:', err);
        }
    }

    async readRanking() {
        this.file = 'ranking';
        this.encryptedPath = this.file + '.enc';
        this.filePath = this.file + '.xml';
        try {
            await this.decryptFile();
            const data = await fs.readFile(this.filePath, 'utf-8')
            const result = await xml2js.parseStringPromise(data);
            await this.encryptFile();
            console.log(JSON.stringify(result));
            console.log(result.ranking.user);
            return result.ranking.user;
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    async writePuntaje(id, category, newscore) {
        this.file = 'puntaje';
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

            // Leer el archivo XML si existe
            try {
                const xmlData = await fs.readFile(this.filePath, 'utf-8');
                usersData = await xml2js.parseStringPromise(xmlData);
            } catch {
                // Si no existe el archivo XML, crear una estructura inicial
                usersData = { scores: { user: [] } };
            }

            // Buscar el usuario por ID
            let user = usersData.scores.user.find(u => u.$.id === id);

            if (!user) {
                console.log('entre aca');
                // Si el usuario no existe, crear uno nuevo con la categoría y un score inicial de 0 + newscore
                user = {
                    $: { id: id },
                    category: [
                        { name: [category], score: [parseInt(newscore)] }
                    ]
                };
                usersData.scores.user.push(user);
            } else {
                // Buscar la categoría dentro del usuario
                let categoryEntry = user.category.find(c => c.name[0] === category);

                if (!categoryEntry) {
                    // Si la categoría no existe, añadirla con un score inicial de 0 + newscore
                    categoryEntry = { name: [category], score: [parseInt(newscore)] };
                    user.category.push(categoryEntry);
                } else {
                    // Si la categoría ya existe, sumar el nuevo puntaje al puntaje actual
                    let currentScore = parseInt(categoryEntry.score[0], 10);
                    categoryEntry.score[0] = (parseInt(currentScore) + parseInt(newscore)).toString();
                }
            }

            // Calcular la suma total de los puntajes del usuario

            // Convertir el objeto de nuevo a XML
            const builder = new xml2js.Builder();
            console.log(JSON.stringify(usersData));
            const newXml = builder.buildObject(usersData);

            // Guardar el nuevo XML en el archivo
            await fs.writeFile(this.filePath, newXml);
            console.log(`Puntaje actualizado para el usuario con ID ${id} en la categoría '${category}'.`);

            // Encriptar el archivo XML después de actualizarlo
            await this.encryptFile();
            try {
                const totalScore = user.category.reduce((sum, c) => sum + parseInt(c.score[0], 10), 0);

                // Llamar a writeRanking para actualizar el maxscore
                await this.writeRanking(id, totalScore);
            } catch (err) {
                console.err("Error al registrar en el ranking");
            }
        } catch (err) {
            console.error('Error al escribir en el perfil:', err);
        }
    }

    async writeRanking(id, maxscore) {
        this.file = 'ranking';
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
    
            let rankingData;
    
            // Leer el archivo XML si existe
            try {
                const xmlData = await fs.readFile(this.filePath, 'utf-8');
                rankingData = await xml2js.parseStringPromise(xmlData);
            } catch {
                // Si no existe el archivo XML, crear una estructura inicial
                rankingData = { ranking: { user: [] } };
            }
    
            // Buscar el usuario por ID
            let user = rankingData.ranking.user.find(u => u.$.id === id);
    
            if (!user) {
                // Si el usuario no existe, agregarlo con el maxscore recibido
                user = {
                    $: { id: id },
                    maxscore: [maxscore.toString()]
                };
                rankingData.ranking.user.push(user);
            } else {
                // Actualizar el maxscore con el nuevo puntaje
                user.maxscore[0] = maxscore.toString();
            }
    
            // Convertir el objeto de nuevo a XML
            const builder = new xml2js.Builder();
            const newXml = builder.buildObject(rankingData);
    
            // Guardar el nuevo XML en el archivo
            await fs.writeFile(this.filePath, newXml);
            console.log(`Ranking actualizado para el usuario con ID ${id} con maxscore ${maxscore}.`);
    
            // Encriptar el archivo XML después de actualizarlo
            await this.encryptFile();
        } catch (err) {
            console.error('Error al escribir en el ranking:', err);
        }
    }

}

module.exports = FileHandler;
