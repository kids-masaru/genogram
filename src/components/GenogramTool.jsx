import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  Users, UserPlus, Heart, X, RotateCcw, Trash2, 
  Download, Square, Circle, Home, Baby 
} from 'lucide-react'

const GenogramTool = () => {
  const canvasRef = useRef(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [people, setPeople] = useState([])
  const [relationships, setRelationships] = useState([])
  const [households, setHouseholds] = useState([])
  const [selectedPeople, setSelectedPeople] = useState(new Set())
  const [draggedPerson, setDraggedPerson] = useState(null)
  const [history, setHistory] = useState([])
  const [nextId, setNextId] = useState(1)

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = Math.max(600, rect.width * 0.6)
      drawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [people, relationships, households, selectedPeople])

  // Save state for undo
  const saveState = () => {
    const state = {
      people: [...people],
      relationships: [...relationships],
      households: [...households]
    }
    setHistory(prev => [...prev.slice(-9), state])
  }

  // Undo function
  const undo = () => {
    if (history.length === 0) return
    const lastState = history[history.length - 1]
    setPeople(lastState.people)
    setRelationships(lastState.relationships)
    setHouseholds(lastState.households)
    setHistory(prev => prev.slice(0, -1))
    setSelectedPeople(new Set())
    setSelectedPerson(null)
  }

  // Add person
  const addPerson = (gender) => {
    saveState()
    const newPerson = {
      id: nextId,
      gender,
      name: '',
      age: '',
      notes: '',
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      isDeceased: false,
      isCaregiver: false,
      isKeyPerson: false
    }
    setPeople(prev => [...prev, newPerson])
    setNextId(prev => prev + 1)
  }

  // Add relationship
  const addRelationship = (type) => {
    if (selectedPeople.size < 2) return
    
    saveState()
    const personIds = Array.from(selectedPeople)
    
    if (type === 'marriage' && personIds.length === 2) {
      const newRel = {
        id: Date.now(),
        type: 'marriage',
        person1: personIds[0],
        person2: personIds[1],
        status: 'married'
      }
      setRelationships(prev => [...prev, newRel])
    } else if (type === 'child' && personIds.length === 3) {
      // Parent-child relationship
      const parents = personIds.slice(0, 2)
      const child = personIds[2]
      const newRel = {
        id: Date.now(),
        type: 'child',
        parents,
        child
      }
      setRelationships(prev => [...prev, newRel])
    } else if (type === 'siblings' && personIds.length >= 2) {
      const newRel = {
        id: Date.now(),
        type: 'siblings',
        siblings: personIds
      }
      setRelationships(prev => [...prev, newRel])
    }
    
    setSelectedPeople(new Set())
  }

  // Add household
  const addHousehold = () => {
    if (selectedPeople.size < 2) return
    
    saveState()
    const newHousehold = {
      id: Date.now(),
      members: Array.from(selectedPeople)
    }
    setHouseholds(prev => [...prev, newHousehold])
    setSelectedPeople(new Set())
  }

  // Delete selected
  const deleteSelected = () => {
    if (selectedPeople.size === 0) return
    
    saveState()
    const selectedIds = Array.from(selectedPeople)
    
    setPeople(prev => prev.filter(p => !selectedIds.includes(p.id)))
    setRelationships(prev => prev.filter(r => {
      if (r.type === 'marriage') {
        return !selectedIds.includes(r.person1) && !selectedIds.includes(r.person2)
      } else if (r.type === 'child') {
        return !selectedIds.includes(r.child) && !r.parents.some(p => selectedIds.includes(p))
      } else if (r.type === 'siblings') {
        return !r.siblings.some(s => selectedIds.includes(s))
      }
      return true
    }))
    setHouseholds(prev => prev.filter(h => 
      !h.members.some(m => selectedIds.includes(m))
    ))
    
    setSelectedPeople(new Set())
    setSelectedPerson(null)
  }

  // Canvas drawing
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw households (background)
    households.forEach(household => {
      const members = people.filter(p => household.members.includes(p.id))
      if (members.length < 2) return
      
      const minX = Math.min(...members.map(m => m.x)) - 30
      const maxX = Math.max(...members.map(m => m.x)) + 30
      const minY = Math.min(...members.map(m => m.y)) - 30
      const maxY = Math.max(...members.map(m => m.y)) + 30
      
      ctx.strokeStyle = '#3b82f6'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
      ctx.setLineDash([])
    })
    
    // Draw relationships
    relationships.forEach(rel => {
      if (rel.type === 'marriage') {
        const person1 = people.find(p => p.id === rel.person1)
        const person2 = people.find(p => p.id === rel.person2)
        if (!person1 || !person2) return
        
        ctx.strokeStyle = rel.status === 'divorced' ? '#ef4444' : '#10b981'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(person1.x, person1.y)
        ctx.lineTo(person2.x, person2.y)
        ctx.stroke()
        
        if (rel.status === 'divorced') {
          const midX = (person1.x + person2.x) / 2
          const midY = (person1.y + person2.y) / 2
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(midX - 10, midY - 10)
          ctx.lineTo(midX + 10, midY + 10)
          ctx.moveTo(midX - 10, midY + 10)
          ctx.lineTo(midX + 10, midY - 10)
          ctx.stroke()
        }
      } else if (rel.type === 'child') {
        const parents = people.filter(p => rel.parents.includes(p.id))
        const child = people.find(p => p.id === rel.child)
        if (parents.length !== 2 || !child) return
        
        const midX = (parents[0].x + parents[1].x) / 2
        const midY = (parents[0].y + parents[1].y) / 2
        
        ctx.strokeStyle = '#8b5cf6'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(midX, midY)
        ctx.lineTo(child.x, child.y)
        ctx.stroke()
      } else if (rel.type === 'siblings') {
        const siblings = people.filter(p => rel.siblings.includes(p.id))
        if (siblings.length < 2) return
        
        siblings.sort((a, b) => a.x - b.x)
        const y = Math.min(...siblings.map(s => s.y)) - 20
        
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(siblings[0].x, y)
        ctx.lineTo(siblings[siblings.length - 1].x, y)
        ctx.stroke()
        
        siblings.forEach(sibling => {
          ctx.beginPath()
          ctx.moveTo(sibling.x, y)
          ctx.lineTo(sibling.x, sibling.y - 20)
          ctx.stroke()
        })
      }
    })
    
    // Draw people
    people.forEach(person => {
      const isSelected = selectedPeople.has(person.id)
      
      ctx.fillStyle = person.isDeceased ? '#374151' : '#ffffff'
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280'
      ctx.lineWidth = isSelected ? 3 : 2
      
      if (person.gender === 'male') {
        // Square for male
        ctx.fillRect(person.x - 20, person.y - 20, 40, 40)
        ctx.strokeRect(person.x - 20, person.y - 20, 40, 40)
        
        if (person.isKeyPerson) {
          ctx.strokeStyle = '#dc2626'
          ctx.lineWidth = 4
          ctx.strokeRect(person.x - 22, person.y - 22, 44, 44)
        }
      } else {
        // Circle for female
        ctx.beginPath()
        ctx.arc(person.x, person.y, 20, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        if (person.isKeyPerson) {
          ctx.strokeStyle = '#dc2626'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(person.x, person.y, 22, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
      
      // Draw deceased X
      if (person.isDeceased) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(person.x - 15, person.y - 15)
        ctx.lineTo(person.x + 15, person.y + 15)
        ctx.moveTo(person.x - 15, person.y + 15)
        ctx.lineTo(person.x + 15, person.y - 15)
        ctx.stroke()
      }
      
      // Draw caregiver indicator
      if (person.isCaregiver) {
        ctx.fillStyle = '#06b6d4'
        ctx.beginPath()
        ctx.arc(person.x + 15, person.y - 15, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Draw name and age
      ctx.fillStyle = '#374151'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      const displayText = person.name || `人物${person.id}`
      if (person.age) {
        ctx.fillText(`${displayText} (${person.age})`, person.x, person.y + 35)
      } else {
        ctx.fillText(displayText, person.x, person.y + 35)
      }
    })
  }

  // Mouse events
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Find clicked person
    const clickedPerson = people.find(person => {
      const dx = x - person.x
      const dy = y - person.y
      return Math.sqrt(dx * dx + dy * dy) < 25
    })
    
    if (clickedPerson) {
      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        setSelectedPeople(prev => {
          const newSet = new Set(prev)
          if (newSet.has(clickedPerson.id)) {
            newSet.delete(clickedPerson.id)
          } else {
            newSet.add(clickedPerson.id)
          }
          return newSet
        })
      } else {
        // Single select
        setSelectedPeople(new Set([clickedPerson.id]))
        setSelectedPerson(clickedPerson)
      }
    } else {
      setSelectedPeople(new Set())
      setSelectedPerson(null)
    }
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const clickedPerson = people.find(person => {
      const dx = x - person.x
      const dy = y - person.y
      return Math.sqrt(dx * dx + dy * dy) < 25
    })
    
    if (clickedPerson) {
      setDraggedPerson({
        person: clickedPerson,
        offsetX: x - clickedPerson.x,
        offsetY: y - clickedPerson.y
      })
    }
  }

  const handleMouseMove = (e) => {
    if (!draggedPerson) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setPeople(prev => prev.map(person => 
      person.id === draggedPerson.person.id
        ? { ...person, x: x - draggedPerson.offsetX, y: y - draggedPerson.offsetY }
        : person
    ))
  }

  const handleMouseUp = () => {
    if (draggedPerson) {
      saveState()
      setDraggedPerson(null)
    }
  }

  // Update selected person
  const updateSelectedPerson = (field, value) => {
    if (!selectedPerson) return
    
    setPeople(prev => prev.map(person =>
      person.id === selectedPerson.id
        ? { ...person, [field]: value }
        : person
    ))
    setSelectedPerson(prev => ({ ...prev, [field]: value }))
  }

  // Toggle person status
  const togglePersonStatus = (field) => {
    if (!selectedPerson) return
    
    saveState()
    const newValue = !selectedPerson[field]
    updateSelectedPerson(field, newValue)
  }

  // Save as image
  const saveAsImage = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = 'genogram.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Clear all
  const clearAll = () => {
    if (confirm('すべてのデータを削除しますか？')) {
      saveState()
      setPeople([])
      setRelationships([])
      setHouseholds([])
      setSelectedPeople(new Set())
      setSelectedPerson(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-4">
        {/* Basic Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              基本操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={history.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                元に戻す
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={deleteSelected}
                disabled={selectedPeople.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                削除
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              選択中: {selectedPeople.size}人
            </div>
          </CardContent>
        </Card>

        {/* Add People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              人物追加
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => addPerson('male')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Square className="h-4 w-4 mr-1" />
                男性
              </Button>
              <Button 
                onClick={() => addPerson('female')}
                className="bg-pink-500 hover:bg-pink-600"
              >
                <Circle className="h-4 w-4 mr-1" />
                女性
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Person Details */}
        {selectedPerson && selectedPeople.size === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">人物詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={selectedPerson.name}
                  onChange={(e) => updateSelectedPerson('name', e.target.value)}
                  placeholder="名前を入力"
                />
              </div>
              <div>
                <Label htmlFor="age">年齢</Label>
                <Input
                  id="age"
                  value={selectedPerson.age}
                  onChange={(e) => updateSelectedPerson('age', e.target.value)}
                  placeholder="年齢を入力"
                />
              </div>
              <div>
                <Label htmlFor="notes">コメント</Label>
                <Textarea
                  id="notes"
                  value={selectedPerson.notes}
                  onChange={(e) => updateSelectedPerson('notes', e.target.value)}
                  placeholder="コメントを入力"
                  rows={3}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Button
                  variant={selectedPerson.isDeceased ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePersonStatus('isDeceased')}
                  className="w-full"
                >
                  {selectedPerson.isDeceased ? '生存に変更' : '死亡'}
                </Button>
                <Button
                  variant={selectedPerson.isCaregiver ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePersonStatus('isCaregiver')}
                  className="w-full"
                >
                  {selectedPerson.isCaregiver ? '主介護者解除' : '主介護者'}
                </Button>
                <Button
                  variant={selectedPerson.isKeyPerson ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePersonStatus('isKeyPerson')}
                  className="w-full"
                >
                  {selectedPerson.isKeyPerson ? 'キーパーソン解除' : 'キーパーソン'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Relationships */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5" />
              関係性
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addRelationship('marriage')}
                disabled={selectedPeople.size !== 2}
              >
                婚姻
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addRelationship('child')}
                disabled={selectedPeople.size !== 3}
              >
                親子
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addRelationship('siblings')}
                disabled={selectedPeople.size < 2}
              >
                兄弟
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={addHousehold}
                disabled={selectedPeople.size < 2}
              >
                <Home className="h-4 w-4 mr-1" />
                同居
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              <p>婚姻: 2人選択</p>
              <p>親子: 親2人+子1人選択</p>
              <p>兄弟・同居: 2人以上選択</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">保存・操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={saveAsImage} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              画像保存
            </Button>
            <Button variant="destructive" onClick={clearAll} className="w-full">
              <X className="h-4 w-4 mr-2" />
              全消去
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Canvas Area */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardContent className="p-0">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full border rounded cursor-crosshair"
              style={{ minHeight: '600px' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GenogramTool
