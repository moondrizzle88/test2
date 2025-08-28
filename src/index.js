import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const prisma = new PrismaClient()

app.use(cors({ origin: true }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (req, res) => res.json({ ok: true }))

app.get('/api/items', async (req, res) => {
  try {
    const { supplier, q, category } = req.query
    const where = {}
    if (supplier) where.supplier = supplier
    if (category) where.category = category
    if (q) where.item = { contains: q, mode: 'insensitive' }
    const items = await prisma.item.findMany({ where, orderBy: { createdAt: 'desc' } })
    res.json(items)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

app.post('/api/items', async (req, res) => {
  try {
    const { supplier, item, category, quantity, price } = req.body
    if (!supplier || !item) return res.status(400).json({ error: 'supplier and item are required' })
    const created = await prisma.item.create({
      data: { supplier, item, category: category || 'Other', quantity: Number(quantity||0), price: Number(price||0) }
    })
    res.status(201).json(created)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create item' }) }
})

app.patch('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { item, category, quantity, price } = req.body
    const updated = await prisma.item.update({
      where: { id },
      data: { ...(item!==undefined && {item}), ...(category!==undefined && {category}),
              ...(quantity!==undefined && {quantity:Number(quantity)}),
              ...(price!==undefined && {price:Number(price)}) }
    })
    res.json(updated)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update item' }) }
})

app.delete('/api/items/:id', async (req, res) => {
  try { await prisma.item.delete({ where:{ id:req.params.id } }); res.json({ok:true}) }
  catch(e){ console.error(e); res.status(500).json({ error: 'Failed to delete item'}) }
})

const webDist = path.join(__dirname, '../web/dist')
app.use(express.static(webDist))
app.get('*', (req,res)=>res.sendFile(path.join(webDist,'index.html')))

const PORT = process.env.PORT || 8080
app.listen(PORT, ()=>console.log(`Server on ${PORT}`))
