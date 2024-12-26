

export const config = {
    port: process.env.PORT || 5555,
    database: process.env.DATABASE_URL ||'mongodb://localhost:27027/live',
    secret: process.env.SECRET || 'your_secret_key',
    jwtExpiration: '1d',
    jwtRefreshExpiration: '30d',
    jwtAlgorithm: 'HS256',
}