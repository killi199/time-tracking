import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import en from './locales/en'
import de from './locales/de'
import { getSetting } from '../db/database'

const resources = {
    en,
    de,
}

const initI18n = async () => {
    let language = 'en' // Default
    try {
        const savedLanguage = getSetting('language')
        if (savedLanguage && savedLanguage !== 'auto') {
            language = savedLanguage
        } else {
            // Use device locale
            const deviceLanguage = Localization.getLocales()[0]?.languageCode
            if (deviceLanguage === 'de') {
                language = 'de'
            }
        }
    } catch (e) {
        console.error('Failed to load language setting', e)
    }

    await i18n.use(initReactI18next).init({
        resources,
        lng: language,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    })
}

export default initI18n
