const Redis = require("ioredis");


class DB {
    constructor() {
        this.redis = new RedisDummy();
    }

    get(key) {
        let json = this.redis.get(key);
        return JSON.parse(json);
    }

    set(key, value) {
        let json = JSON.stringify(value);
        this.redis.set(key, json);
    }
}

class RedisDummy {
    static data = {};
    get (key) {
        console.log("get", key)
        return RedisDummy.data[key];
    }
    set (key, value) {
        console.log("set", key, value)
        RedisDummy.data[key] = value;
    }
}

module.exports = DB;