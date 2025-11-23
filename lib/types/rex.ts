import { Prisma } from '@prisma/client'

// Type pour REX avec relations
export type RexWithAuthor = Prisma.RexGetPayload<{
  include: {
    author: {
      select: {
        name: true
        email: true
      }
    }
    _count: {
      select: {
        comments: true
      }
    }
  }
}>

export type RexWithDetails = Prisma.RexGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        email: true
        role: true
      }
    }
    comments: {
      include: {
        author: {
          select: {
            name: true
            email: true
          }
        }
      }
      orderBy: {
        createdAt: 'desc'
      }
    }
    attachments: true
    sdis: {
      select: {
        code: true
        name: true
      }
    }
  }
}>