import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ContactCard } from '@/components/contacts/ContactCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { ContactDetailsModal } from '@/components/contacts/ContactDetailsModal'
import { contactsService } from '@/services/contacts.service'
import { useLocale } from '@/contexts/localeContext'
import type { Contact, CreateContactInput, ContactFilters } from '@/types'

export const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [filters, setFilters] = useState<ContactFilters>({})
  const [searchParams, setSearchParams] = useSearchParams()
  const copyHandledRef = useRef<string | null>(null)
  const { t } = useLocale()
  const sharedContactId = useMemo(() => {
    const param = searchParams.get('contact')
    if (!param) return null
    const parsed = Number(param)
    return Number.isFinite(parsed) ? parsed : null
  }, [searchParams])
  const shareToken = searchParams.get('shareToken')
  const copyToken = searchParams.get('copyToken')

  const loadContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await contactsService.getContacts(filters)
      setContacts(response.results)
    } catch {
      toast.error(t('contacts.loadFail'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, t])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const updateContactShareParam = useCallback((contactId: number | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (contactId) {
        next.set('contact', String(contactId))
      } else {
        next.delete('contact')
      }
      next.delete('shareToken')
      next.delete('copyToken')
      return next
    })
  }, [setSearchParams])

  useEffect(() => {
    if (!sharedContactId || shareToken || copyToken) return
    const existingContact = contacts.find(contact => contact.id === sharedContactId)
    if (existingContact) {
      setSelectedContact(existingContact)
      setIsDetailsModalOpen(true)
      return
    }
    let isActive = true
    const loadSharedContact = async () => {
      try {
        const contact = await contactsService.getContact(sharedContactId)
        if (!isActive) return
        setSelectedContact(contact)
        setIsDetailsModalOpen(true)
      } catch {
        if (!isActive) return
        toast.error(t('contacts.openFail'))
      }
    }
    loadSharedContact()
    return () => {
      isActive = false
    }
  }, [contacts, copyToken, shareToken, sharedContactId, t])

  useEffect(() => {
    if (shareToken || copyToken) return
    copyHandledRef.current = null
  }, [copyToken, shareToken])

  useEffect(() => {
    if (!shareToken) return
    let isActive = true
    const loadSharedContact = async () => {
      try {
        const contact = await contactsService.acceptSharedContact(shareToken)
        if (!isActive) return
        setSelectedContact(contact)
        setIsDetailsModalOpen(true)
        await loadContacts()
      } catch {
        if (!isActive) return
        toast.error(t('contacts.openFail'))
      }
    }
    loadSharedContact()
    return () => {
      isActive = false
    }
  }, [loadContacts, shareToken, t])

  useEffect(() => {
    if (!copyToken) return
    if (copyHandledRef.current === copyToken) return
    copyHandledRef.current = copyToken
    let isActive = true
    const createCopy = async () => {
      try {
        const created = await contactsService.copySharedContact(copyToken)
        if (!isActive) return
        toast.success(t('contacts.shareCopyCreated'))
        setSelectedContact(created)
        setIsDetailsModalOpen(true)
        updateContactShareParam(null)
        loadContacts()
      } catch {
        if (!isActive) return
        toast.error(t('contacts.shareCopyFail'))
      }
    }
    createCopy()
    return () => {
      isActive = false
    }
  }, [copyToken, t, updateContactShareParam, loadContacts])

  const handleCreateContact = async (data: CreateContactInput) => {
    try {
      await contactsService.createContact(data)
      toast.success(t('contacts.createSuccess'))
      setIsCreateModalOpen(false)
      loadContacts()
    } catch {
      toast.error(t('contacts.createFail'))
    }
  }

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDetailsModalOpen(true)
    updateContactShareParam(contact.id)
  }

  const handleContactUpdate = () => {
    setIsDetailsModalOpen(false)
    updateContactShareParam(null)
    loadContacts()
  }

  const handleContactClose = () => {
    setIsDetailsModalOpen(false)
    updateContactShareParam(null)
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('contacts.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{t('contacts.subtitle')}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('contacts.new')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('contacts.searchPlaceholder')}
            value={filters.search || ''}
            onChange={e => handleSearch(e.target.value)}
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Contacts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">{t('contacts.loading')}</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">{t('contacts.empty')}</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              {t('contacts.emptyAction')}
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
        title={t('contacts.createTitle')}
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
          onClose={handleContactClose}
          onUpdate={handleContactUpdate}
          isReadOnly={Boolean(shareToken) || selectedContact.is_owner === false}
        />
      )}
    </Layout>
  )
}
