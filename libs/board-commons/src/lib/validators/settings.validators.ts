import { z } from 'zod';
import { NodeValidator } from '../models/node.model.js';

const settings = z.object({
  anonymousMode: z.boolean().default(false),
});

export const SETTINGS_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    if (!state.isAdmin) {
      return {
        success: false,
      };
    }

    const setting = state.nodes.find((it) => it.type === 'settings');

    if (setting) {
      return {
        success: false,
      };
    }

    const validation = settings.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: validation.data,
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: async (data, state) => {
    if (!state.isAdmin) {
      return {
        success: false,
      };
    }

    const validation = settings.partial().safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: validation.data,
        },
      };
    }

    return {
      success: false,
    };
  },
  remove: async (data, state) => {
    if (!state.isAdmin) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      data,
    };
  },
};
