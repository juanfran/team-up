import { Injectable } from '@angular/core';
import { Note } from '@team-up/board-commons';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  getNew(data: Pick<Note, 'ownerId' | 'position'>): Note {
    return {
      ...data,
      text: '',
      votes: [],
      emojis: [],
      drawing: [],
      ...data,
    };
  }
}
