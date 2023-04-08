const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');

const options = {
  secretOrKey: process.env.JWT_SECRET_KEY,
  jwtFromRequest: ExtractJwt.fromHeader('x-api-key'),
};

passport.use(
  new JwtStrategy(options, async function (jwt_payload, done) {
    try {
      // check if token payload contains userId field
      if (jwt_payload.userId) {
        return done(null, { _id: jwt_payload.userId });
      }
      return done(null, false);
    } catch (error) {
      return done(error);
    }
  })
);

module.exports.tokenChecker = function (req, res, next) {
  passport.authenticate('jwt', { session: false }, function (err, user, info) {
   
    if (err) {
      return res.status(500).send({ status: false, message: err.message });
    }
    if (!user) {
      return res.status(401).send({ status: false, message: 'Token invalid' });
    }
    req.user = user;

    return next();
  })(req, res, next);
};
