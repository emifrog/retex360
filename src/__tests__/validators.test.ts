import { loginSchema, registerSchema } from '@/lib/validators/auth';
import {
  passwordChangeSchema,
  commentSchema,
  roleUpdateSchema,
  searchSchema,
  profileUpdateSchema,
  aiAnalysisSchema,
} from '@/lib/validators/api';

describe('Auth validators', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty fields', () => {
      const result = loginSchema.safeParse({ email: '', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      email: 'user@example.com',
      password: 'Password1234',
      confirmPassword: 'Password1234',
      fullName: 'John Doe',
      sdisId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('accepts valid registration', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password under 12 characters', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: 'Short1',
        confirmPassword: 'Short1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: 'password1234',
        confirmPassword: 'password1234',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without a digit', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: 'PasswordNoDigit',
        confirmPassword: 'PasswordNoDigit',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short name', () => {
      const result = registerSchema.safeParse({
        ...validData,
        fullName: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid SDIS UUID', () => {
      const result = registerSchema.safeParse({
        ...validData,
        sdisId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('API validators', () => {
  describe('passwordChangeSchema', () => {
    it('accepts valid password change', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpass',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty current password', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak new password (< 12 chars or missing class)', () => {
      expect(passwordChangeSchema.safeParse({
        currentPassword: 'oldpass', newPassword: 'short',
      }).success).toBe(false);
      expect(passwordChangeSchema.safeParse({
        currentPassword: 'oldpass', newPassword: 'newpassword123', // pas de majuscule
      }).success).toBe(false);
    });
  });

  describe('commentSchema', () => {
    it('accepts valid comment', () => {
      const result = commentSchema.safeParse({ content: 'A comment' });
      expect(result.success).toBe(true);
    });

    it('rejects empty comment', () => {
      const result = commentSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('rejects comment exceeding 5000 chars', () => {
      const result = commentSchema.safeParse({ content: 'x'.repeat(5001) });
      expect(result.success).toBe(false);
    });

    it('accepts optional parent_id as UUID', () => {
      const result = commentSchema.safeParse({
        content: 'Reply',
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('roleUpdateSchema', () => {
    it('accepts valid role update', () => {
      const result = roleUpdateSchema.safeParse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = roleUpdateSchema.safeParse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'hacker',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid roles', () => {
      for (const role of ['user', 'validator', 'admin', 'super_admin']) {
        const result = roleUpdateSchema.safeParse({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          role,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('searchSchema', () => {
    it('accepts valid search', () => {
      const result = searchSchema.safeParse({ query: 'incendie' });
      expect(result.success).toBe(true);
    });

    it('rejects empty query', () => {
      const result = searchSchema.safeParse({ query: '' });
      expect(result.success).toBe(false);
    });

    it('rejects query exceeding 500 chars', () => {
      const result = searchSchema.safeParse({ query: 'x'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('profileUpdateSchema', () => {
    it('accepts valid profile update', () => {
      const result = profileUpdateSchema.safeParse({
        full_name: 'Jean Dupont',
        grade: 'Capitaine',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = profileUpdateSchema.safeParse({ full_name: 'J' });
      expect(result.success).toBe(false);
    });
  });

  describe('aiAnalysisSchema', () => {
    it('accepts valid analysis request', () => {
      const result = aiAnalysisSchema.safeParse({
        rexId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'summary',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid analysis type', () => {
      const result = aiAnalysisSchema.safeParse({
        rexId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'hack',
      });
      expect(result.success).toBe(false);
    });
  });
});
