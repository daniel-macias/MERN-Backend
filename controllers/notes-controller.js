const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Note = require('../models/Note');
const User = require('../models/User');

//Get a Note by ID
const getNoteById = async (req, res, next) => {
  const noteId = req.params.nid;

  let note;
  console.log(noteId);
  try {
    note = await Note.findById(noteId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a note.',
      500
    );
    return next(error);
  }

  if (!note) {
    const error = new HttpError(
      'Could not find note for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ note: note.toObject({ getters: true }) });
};

//Find Note based on the user id
const getNotesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  
  let userWithNotes;
  try {
    userWithNotes = await User.findById(userId).populate('notes');
    console.log("AAAA", userWithNotes);
  } catch (err) {
    const error = new HttpError(
      'Fetching notes failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!userWithNotes || userWithNotes.notes.length === 0) {
    return next(
      new HttpError('Could not find notes for the provided user id.', 404)
    );
  }

  res.json({
    notes: userWithNotes.notes.map(note =>
      note.toObject({ getters: true })
    )
  });
};


// Create a Note
const createNote = async (req, res, next) => {

  const { title, body } = req.body;

  const createdNote = new Note({
    title,
    body,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
    
  } catch (err) {
    const error = new HttpError(
      'Creating note failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdNote.save({ session: sess });
    user.notes.push(createdNote);
    await user.save({ session: sess });
    await sess.commitTransaction();

  } catch (err) {
    const error = new HttpError(
      'Creating note failed, please try again.',
      500
    );
    console.log(err);
    return next(error);
  }

  res.status(201).json({ note: createdNote });
};

exports.getNoteById = getNoteById;
exports.createNote = createNote;
exports.getNotesByUserId = getNotesByUserId;