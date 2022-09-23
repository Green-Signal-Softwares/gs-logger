import winston from "winston";
import DailyRotateFile, { DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import chalk from "chalk";
import superjson from "superjson";
import path from "path";

export type JSONType = string | number | boolean | undefined | JSONObjectType | Array<JSONType>;
export type JSONObjectType = { [x: string]: JSONType };
export type CommonLog<T> = T & { level: string; timestamp: string };
export interface LogPayload {
  message: string;
  data?: JSONObjectType;
  session?: JSONObjectType;
  tags?: string[];
}

const myCustomLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
  },
  colors: {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.cyan,
    success: chalk.green,
    debug: chalk.gray,
  },
};

function getStringDate(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = `${date.getFullYear()}`.padStart(4, "0");

  const timeString = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  return timeString;
}

function parseJsonToLog({ timestamp, message, level, data }: CommonLog<LogPayload>) {
  const colors = myCustomLevels.colors as Record<string, chalk.Chalk>;
  const date = chalk.gray(`[${getStringDate(new Date(timestamp))}]`);

  const processed = message
    .replace(/\*(.*?)\*/g, (match, p1) => {
      return chalk.bold(p1);
    })
    .replace(/\_(.*?)\_/g, (match, p1) => {
      return chalk.italic(p1);
    });

  const logs = [`${date} ${colors[level](processed)}`];

  if (data) {
    logs.push(JSON.stringify(data, null, 2));
  }

  return logs.join(" ");
}

const rotateFileTransport = ({
  path: logsPath,
  datePattern = "YYYY-MM-DD",
  maxSize = "20m",
  ...rest
}: Record<string, any> & DailyRotateFileTransportOptions) => {
  const filename = path.resolve(logsPath, `%DATE%.log`);

  return new DailyRotateFile({
    // @ts-ignore
    filename,
    datePattern,
    maxSize,
    ...rest,
  });
};

const consoleFormat = () => {
  return winston.format.printf((obj) => {
    return parseJsonToLog(obj as CommonLog<LogPayload>);
  });
};

const fileFormat = () => {
  return winston.format.printf((obj) => {
    return JSON.stringify(obj);
  });
};

export const transporters = {
  console: () =>
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), consoleFormat()),
      handleExceptions: true,
      level: "debug",
    }),
  file: (path: string) =>
    rotateFileTransport({
      format: winston.format.combine(winston.format.timestamp(), fileFormat()),
      handleExceptions: true,
      level: "debug",
      path,
    }),
};

interface LoggerOptions {
  path: string;
  logger?: winston.Logger;
  session?: LogPayload["session"];
  tags?: LogPayload["tags"];
}

export class Logger {
  private _logger!: winston.Logger;
  private _session?: LogPayload["session"];
  private _tags?: LogPayload["tags"];
  private _path!: string;

  private _consoleTransporter!: winston.transports.ConsoleTransportInstance;
  private _fileTransporter!: DailyRotateFile;

  constructor(options: LoggerOptions) {
    this._consoleTransporter = transporters.console();
    this._fileTransporter = transporters.file(options.path);
    this._logger =
      options.logger ||
      winston.createLogger({
        levels: myCustomLevels.levels,
        transports: [this._consoleTransporter, this._fileTransporter],
      });
    this._session = options.session;
    this._path = options.path;
    this._tags = options.tags;
  }

  private extend({
    logger = this._logger,
    session = this._session,
    path = this._path,
    tags = this._tags,
  }: Partial<LoggerOptions> = {}) {
    return new Logger({ logger, session, path, tags });
  }

  public withSession(data: LogPayload["data"]) {
    return this.extend({ session: { ...this._session, ...data } });
  }

  public withTags(...data: string[]) {
    return this.extend({ tags: [...(this._tags || []), ...data] });
  }

  public addSession(data: LogPayload["data"]) {
    this._session = { ...this._session, ...data };
    return this.removeSession(data);
  }

  public addTag(...data: string[]) {
    this._tags = [...(this._tags || []), ...data];
    return this.removeTag(...data);
  }

  private removeSession(data: LogPayload["data"]) {
    return () => {
      if (!data || !this._session) return;
      for (const key of Object.keys(data)) delete this._session[key];
    };
  }

  private removeTag(...data: string[]) {
    return () => {
      if (!this._tags) return;
      this._tags = this._tags.filter((tag) => !data.includes(tag));
    };
  }

  public clearSession() {
    this._session = undefined;
  }

  public clearTags() {
    this._tags = undefined;
  }

  private log(
    getLogMethod: (logger: winston.Logger) => winston.LeveledLogMethod,
    message: LogPayload["message"],
    data?: LogPayload["data"]
  ) {
    const payload: LogPayload = {
      message,
      data: superjson.serialize(data).json as LogPayload["data"],
      session: superjson.serialize(this._session).json as LogPayload["session"],
    };

    getLogMethod(this._logger)(payload);
    return this;
  }

  info(message: string, data?: Record<string, any>) {
    return this.log((logger) => logger.info, message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    return this.log((logger) => logger.warn, message, data);
  }

  error(message: string, data?: Record<string, any>) {
    return this.log((logger) => logger.error, message, data);
  }

  success(message: string, data?: Record<string, any>) {
    // @ts-ignore
    return this.log((logger) => logger.success, message, data);
  }

  debug(message: string, data?: Record<string, any>) {
    return this.log((logger) => logger.debug, message, data);
  }

  divider() {
    const divider = Array.from({ length: 80 }, () => "-").join("");
    return this.debug(divider);
  }

  timer(name: string) {
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
