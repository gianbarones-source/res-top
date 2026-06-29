'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Restaurant = { id: string; name: string }

type RestaurantContextType = {
  restaurants: Restaurant[]
  selectedId: string
  selectedName: string
  setSelectedId: (id: string) => void
  role: string
  userId: string
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurants: [], selectedId: '', selectedName: '',
  setSelectedId: () => {}, role: '', userId: ''
})

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [role, setRole] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id, role')
        .eq('id', user.id)
        .single()

      if (!profile) return
      setRole(profile.role)

      if (profile.role === 'empleado') {
        // Empleado solo ve su local
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('id', profile.restaurant_id)
          .single()
        if (rest) {
          setRestaurants([rest])
          setSelectedId(rest.id)
        }
      } else {
        // Admin y franquiciado ven sus locales asignados
        const { data: asignados } = await supabase
          .from('franquiciado_restaurants')
          .select('restaurant_id, restaurants(id, name)')
          .eq('franquiciado_id', user.id)

        const rests = (asignados || [])
          .map((a: any) => a.restaurants)
          .filter(Boolean) as Restaurant[]

        if (rests.length > 0) {
          setRestaurants(rests)
          const saved = localStorage.getItem('restop_selected_restaurant')
          const valid = rests.find(r => r.id === saved)
          setSelectedId(valid ? valid.id : rests[0].id)
        } else if (profile.restaurant_id) {
          // Fallback: usar restaurant_id del profile
          const { data: rest } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', profile.restaurant_id)
            .single()
          if (rest) {
            setRestaurants([rest])
            setSelectedId(rest.id)
          }
        }
      }
    }
    load()
  }, [])

  const handleSetSelected = (id: string) => {
    setSelectedId(id)
    localStorage.setItem('restop_selected_restaurant', id)
  }

  const selectedName = restaurants.find(r => r.id === selectedId)?.name || ''

  return (
    <RestaurantContext.Provider value={{ restaurants, selectedId, selectedName, setSelectedId: handleSetSelected, role, userId }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export const useRestaurant = () => useContext(RestaurantContext)
