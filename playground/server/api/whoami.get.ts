import { defineEventHandler } from '@dvlkit/nuxe/server'

export default defineEventHandler((_) => {
  return {
    id: '0fc98cdf-53b1-4ed6-b0bb-907c37a4cc10',
    code: '26093',
    slug: 'calza-deportiva-26093',
    name: 'Calza deportiva',
    brand: 'Bsoul',
    price: 10000,
    conditions: ['nuevo'],
    images: [{ url: '/img.png' }],
  }
})
