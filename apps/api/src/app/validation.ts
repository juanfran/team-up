import { CommonState, StateActions, Validators } from '@team-up/board-commons';

import { validate as noteValidator } from '@team-up/board-commons/validators/note';

import { type ZodAny } from 'zod';

const validations = {
  custom: {
    note: noteValidator,
  },
  new: {
    panel: Validators.newPanel,
    group: Validators.newGroup,
    image: Validators.newImage,
    vector: Validators.newVector,
    text: Validators.newText,
  } as Record<string, unknown>,
  patch: {
    panel: Validators.patchPanel,
    group: Validators.patchGroup,
    image: Validators.patchImage,
    vector: Validators.patchVector,
    text: Validators.patchText,
  } as Record<string, unknown>,
};

export const validateAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: StateActions,
  state: CommonState,
  userId: string
) => {
  const stateType = msg.data.type as keyof CommonState;
  const customValidators = msg.data.type in validations.custom;

  if (customValidators) {
    return validations.custom[msg.data.type as keyof typeof validations.custom](
      msg,
      state,
      userId
    );
  } else {
    if (msg.op === 'patch' || msg.op === 'remove') {
      const validator = validations['patch'][msg.data.type];

      // check if the element present in the state
      if (Array.isArray(state[stateType])) {
        const node = (state[stateType] as Array<{ id: string }>).find(
          (it) => it.id === msg.data.id
        );

        if (!node) {
          return false;
        }
      }

      if (msg.op === 'remove') {
        return {
          op: msg.op,
          data: {
            id: msg.data.id,
            type: msg.data.type,
          },
        };
      } else if (msg.op === 'patch') {
        if (validator) {
          const validatorResult = (validator as ZodAny).safeParse(
            msg.data.content
          );

          if (!validatorResult.success) {
            return false;
          }

          return {
            op: msg.op,
            data: {
              id: msg.data.id,
              type: msg.data.type,
              content: validatorResult.data,
            },
          };
        }
      }
    } else if (msg.op === 'add') {
      const validator = validations['new'][msg.data.type];

      if (validator) {
        const validatorResult = (validator as ZodAny).safeParse(
          msg.data.content
        );

        if (!validatorResult.success) {
          return false;
        }

        return {
          op: msg.op,
          data: {
            id: msg.data.id,
            type: msg.data.type,
            content: validatorResult.data,
          },
        };
      }
    }
  }

  return false;
};

export const validation = (
  msg: StateActions[],
  state: CommonState,
  userId: string
) => {
  if (Array.isArray(msg)) {
    msg = msg.filter((it) => Validators.stateAction.safeParse(it).success);

    const actions = msg.map((it) => {
      return validateAction(it, state, userId);
    });

    if (actions.every((it) => it)) {
      return actions as StateActions[];
    }
  }

  return [];
};
