require('dotenv').config()
const axios = require('axios').create({
    withCredentials: true,
    baseURL: 'https://api.podio.com/'
})

// axios.post('oauth/token/v2', {
//     grant_type: 'refresh_token',
//     client_id: process.env.PODIO_CLIENT_ID,
//     client_secret: process.env.PODIO_CLIENT_SECRET,
//     refresh_token: 'f0fa964ff4f82ec688ff5edc6f3ef923'
// })
// .then(response => {
//     console.log(response.data)
// })
// .catch(error => {
//     if (error.response.data) {
//         console.error('Authentication error:', error.response.data)
//     } else {
//         console.error('Authentication error:', error)
//     }
// })

class PodioApp {
    constructor(parameters) {
        Object.keys(parameters).forEach(key => {
            this[key] = parameters[key]
        })
    }

    async getAccessToken() {
        await axios.post('oauth/token/v2', {
            grant_type: 'app',
            app_id: this.app_id,
            app_token: this.app_token,
            client_id: this.client_id,
            client_secret: this.client_secret
        })
        .then(response => {
            this.accessToken = response.data.access_token
        })
        .catch(error => {
            if (error.response.data) {
                console.error({
                    message: 'Access Token Error',
                    error: error.response.data
                })
            } else {
                console.error({
                    message: 'Access Token Error',
                    error: error
                })
            }
        })
    }



    async getApp() {
        return new Promise(async (resolve, reject) => {
            await this.getAccessToken()

            axios.get(`/app/${this.app_id}`, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            })
            .then(response => resolve(response.data))
            .catch(error => {
                if (error.response.data) {
                    reject({
                        message: 'Get App Error',
                        error: error.response.data
                    })
                } else {
                    reject({
                        message: 'Get App Error',
                        error: error
                    })
                }
            })
        })
    }


    async createEmbed(parameters) {
        return new Promise(async (resolve, reject) => {
            await this.getAccessToken()

            await axios.post('/embed/', parameters, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            })
            .then(response => resolve(response.data))
            .catch(error => {
                if (error.response.data) {
                    reject({
                        message: 'Create Embed Error',
                        error: error.response.data
                    })
                } else {
                    reject({
                        message: 'Create Embed Error',
                        error: error
                    })
                }
            })
        })
    }



    async addItem(fields) {
        return new Promise(async (resolve, reject) => {
            await this.getAccessToken()

            axios.post(`/item/app/${this.app_id}/`, {fields}, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            })
            .then(response => {
                resolve(response.data)
            })
            .catch(error => {
                if (error.response.data) {
                    reject({
                        message: 'Add Item Error',
                        error: error.response.data
                    })
                } else {
                    reject({
                        message: 'Add Item Error',
                        error: error
                    })
                }
            })
        })
    }
}

module.exports = PodioApp