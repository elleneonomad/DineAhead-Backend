const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // Firebase errors
  if (err.code) {
    switch (err.code) {
      case 'auth/email-already-exists':
        error.message = 'Email already registered';
        error.status = 400;
        break;
      case 'auth/invalid-email':
        error.message = 'Invalid email address';
        error.status = 400;
        break;
      case 'auth/weak-password':
        error.message = 'Password is too weak';
        error.status = 400;
        break;
      case 'auth/user-not-found':
        error.message = 'User not found';
        error.status = 404;
        break;
      case 'auth/wrong-password':
        error.message = 'Incorrect password';
        error.status = 401;
        break;
    }
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFound
};