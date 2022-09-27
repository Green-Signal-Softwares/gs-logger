"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.transporters = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const chalk_1 = __importDefault(require("chalk"));
const superjson_1 = __importDefault(require("superjson"));
const path_1 = __importDefault(require("path"));
const myCustomLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        success: 3,
        debug: 4,
    },
    colors: {
        error: chalk_1.default.red,
        warn: chalk_1.default.yellow,
        info: chalk_1.default.cyan,
        success: chalk_1.default.green,
        debug: chalk_1.default.gray,
    },
};
function getStringDate(date) {
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    const seconds = `${date.getSeconds()}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = `${date.getFullYear()}`.padStart(4, "0");
    const timeString = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    return timeString;
}
function parseJsonToLog({ timestamp, message, level, data }) {
    const colors = myCustomLevels.colors;
    const date = chalk_1.default.gray(`[${getStringDate(new Date(timestamp))}]`);
    const processed = message
        .replace(/\*(.*?)\*/g, (match, p1) => {
        return chalk_1.default.bold(p1);
    })
        .replace(/\_(.*?)\_/g, (match, p1) => {
        return chalk_1.default.italic(p1);
    });
    const logs = [`${date} ${colors[level](processed)}`];
    if (data) {
        logs.push(JSON.stringify(data, null, 2));
    }
    return logs.join(" ");
}
const rotateFileTransport = ({ path: logsPath, datePattern = "YYYY-MM-DD", maxSize = "20m", ...rest }) => {
    const filename = path_1.default.resolve(logsPath, `%DATE%.log`);
    return new winston_daily_rotate_file_1.default({
        // @ts-ignore
        filename,
        datePattern,
        maxSize,
        ...rest,
    });
};
const consoleFormat = () => {
    return winston_1.default.format.printf((obj) => {
        return parseJsonToLog(obj);
    });
};
const fileFormat = () => {
    return winston_1.default.format.printf((obj) => {
        return JSON.stringify(obj);
    });
};
exports.transporters = {
    console: () => new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), consoleFormat()),
        handleExceptions: true,
        level: "debug",
    }),
    file: (path) => rotateFileTransport({
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), fileFormat()),
        handleExceptions: true,
        level: "debug",
        path,
    }),
};
class Logger {
    _logger;
    _session;
    _tags;
    _path;
    _consoleTransporter;
    _fileTransporter;
    constructor(options) {
        this._consoleTransporter = exports.transporters.console();
        this._fileTransporter = exports.transporters.file(options.path);
        this._logger =
            options.logger ||
                winston_1.default.createLogger({
                    levels: myCustomLevels.levels,
                    transports: [this._consoleTransporter, this._fileTransporter],
                });
        this._session = options.session;
        this._path = options.path;
        this._tags = options.tags;
    }
    extend({ logger = this._logger, session = this._session, path = this._path, tags = this._tags, } = {}) {
        return new Logger({ logger, session, path, tags });
    }
    /**
     * Create a new instance of Logger extending the session data
     */
    withSession(data) {
        return this.extend({ session: { ...this._session, ...data } });
    }
    /**
     * Create a new instance of Logger extending the tags data
     */
    withTags(...data) {
        return this.extend({ tags: [...(this._tags || []), ...data] });
    }
    /**
     * Extends this istance of Logger with new session data
     */
    addSession(data) {
        this._session = { ...this._session, ...data };
        return this.removeSession(data);
    }
    /**
     * Extends this istance of Logger with new tags data
     */
    addTag(...data) {
        this._tags = [...(this._tags || []), ...data];
        return this.removeTag(...data);
    }
    /**
     * Remove the session data in this instance
     */
    removeSession(data) {
        return () => {
            if (!data || !this._session)
                return;
            for (const key of Object.keys(data))
                delete this._session[key];
        };
    }
    /**
     * Remove the tags data in this instance
     */
    removeTag(...data) {
        return () => {
            if (!this._tags)
                return;
            this._tags = this._tags.filter((tag) => !data.includes(tag));
        };
    }
    /**
     * Clear all session in this instance
     */
    clearSession() {
        this._session = undefined;
    }
    /**
     * Clear all tags in this instance
     */
    clearTags() {
        this._tags = undefined;
    }
    log(getLogMethod, message, data) {
        const payload = {
            message,
            data: superjson_1.default.serialize(data).json,
            session: superjson_1.default.serialize(this._session).json,
        };
        getLogMethod(this._logger)(payload);
        return this;
    }
    info(message, data) {
        return this.log((logger) => logger.info, message, data);
    }
    warn(message, data) {
        return this.log((logger) => logger.warn, message, data);
    }
    error(message, data) {
        return this.log((logger) => logger.error, message, data);
    }
    success(message, data) {
        // @ts-ignore
        return this.log((logger) => logger.success, message, data);
    }
    debug(message, data) {
        return this.log((logger) => logger.debug, message, data);
    }
    divider() {
        const divider = Array.from({ length: 80 }, () => "-").join("");
        return this.debug(divider);
    }
    timer(name) {
        let seconds = 0;
        const timer = setInterval(() => (seconds += 0.25), 250);
        return {
            finish: () => {
                clearInterval(timer);
                this.info(`${name}: *${seconds.toFixed(1)}s*`);
            },
        };
    }
    disableFile() {
        this._logger.remove(this._fileTransporter);
        return this;
    }
    enableFile() {
        this._logger.add(this._fileTransporter);
        return this;
    }
}
exports.Logger = Logger;
