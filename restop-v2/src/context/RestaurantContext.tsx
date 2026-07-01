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
        .maybeSingle()

      if (!profile) return
      setRole(profile.role)

      if (profile.role === 'empleado') {
        // Empleado: solo su restaurant asignado en profiles
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('id', profile.restaurant_id)
          .maybeSingle()
        if (rest) {
          setRestaurants([rest])
          setSelectedId(rest.id)
        }
      } else if (profile.role === 'admin') {
        // Admin: todos los restaurants (RLS ya filtra via get_my_restaurant_ids)
        const { data: todos } = await supabase
          .from('restaurants')
          .select('id, name')
          .order('name')

        const rests = (todos || []) as Restaurant[]
        if (rests.length > 0) {
          setRestaurants(rests)
          const saved = localStorage.getItem('restop_selected_restaurant')
          const valid = rests.find(r => r.id === saved)
          setSelectedId(valid ? valid.id : rests[0].id)
        }
      } else {
        // Franquiciado: sus restaurants via franquiciado_restaurants
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
