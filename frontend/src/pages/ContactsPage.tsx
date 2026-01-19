import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ContactCard } from '@/components/contacts/ContactCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { ContactDetailsModal } from '@/components/contacts/ContactDetailsModal'
import { contactsService } from '@/services/contacts.service'
import type { Contact, CreateContactInput, ContactFilters } from '@/types'

export const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [filters, setFilters] = useState<ContactFilters>({})

  useEffect(() => {
    loadContacts()
  }, [filters])

  const loadContacts = async () => {
    setIsLoading(true)
    try {
      const response = await contactsService.getContacts(filters)
      setContacts(response.results)
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateContact = async (data: CreateContactInput) => {
    try {
      await contactsService.createContact(data)
      toast.success('Contact created successfully')
      setIsCreateModalOpen(false)
      loadContacts()
    } catch (error) {
      toast.error('Failed to create contact')
    }
  }

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDetailsModalOpen(true)
  }

  const handleContactUpdate = () => {
    setIsDetailsModalOpen(false)
    loadContacts()
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value || undefined }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-1">Manage your contact book</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            value={filters.search || ''}
            onChange={e => handleSearch(e.target.value)}
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Contacts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No contacts found</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              Create your first contact
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => handleContactClick(contact)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Contact"
      >
        <ContactForm
          onSubmit={handleCreateContact}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Contact Details Modal */}
      {selectedContact && (
        <ContactDetailsModal
          contact={selectedContact}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onUpdate={handleContactUpdate}
        />
      )}
    </Layout>
  )
}
