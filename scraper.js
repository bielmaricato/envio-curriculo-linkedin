const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class LinkedInJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.jobs = [];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true, // Pode alterar para false para debug
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Configurar headers para evitar bloqueio
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });
    }

    async searchRemoteSeniorSystemsAnalystJobs(maxPages = 5) {
        try {
            // URL de busca para vagas remotas de Analista de Sistemas Sênior
            const baseUrl = 'https://www.linkedin.com/jobs/search/';
            const params = new URLSearchParams({
                'keywords': 'Analista de Sistemas Sênior',
                'location': 'Brasil',
                'f_WF': '9', // Remote filter
                'f_E': '4', // Senior level
                'f_JT': 'F', // Full-time
                'sortBy': 'DD', // Most recent
                'position': '1',
                'pageNum': '0'
            });

            const searchUrl = `${baseUrl}?${params.toString()}`;
            
            console.log(`Buscando vagas em: ${searchUrl}`);
            await this.page.goto(searchUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await this.delay(5000);

            let currentPage = 1;
            
            while (currentPage <= maxPages) {
                console.log(`\n🔍 Processando página ${currentPage}...`);
                
                const pageJobs = await this.extractJobsFromPage();
                this.jobs = this.jobs.concat(pageJobs);
                
                console.log(`✅ Encontradas ${pageJobs.length} vagas nesta página`);
                
                // Tentar próxima página
                const hasNextPage = await this.goToNextPage();
                if (!hasNextPage) {
                    console.log('⏹️  Não há mais páginas disponíveis');
                    break;
                }
                
                currentPage++;
                await this.delay(3000); // Delay entre páginas
            }

            // Remover duplicatas
            this.jobs = this.removeDuplicates(this.jobs);
            
            console.log(`\n🎯 Total de vagas encontradas: ${this.jobs.length}`);
            return this.jobs;

        } catch (error) {
            console.error('❌ Erro na busca de vagas:', error);
            return [];
        }
    }

    async extractJobsFromPage() {
        try {
            const content = await this.page.content();
            const $ = cheerio.load(content);

            const jobs = [];

            // Seletores para as vagas - podem variar
            $('.jobs-search__results-list li, .job-search-card, [data-entity-urn*="jobPosting"]').each((index, element) => {
                try {
                    const $element = $(element);
                    
                    // Extrair informações da vaga
                    const title = $element.find('.base-search-card__title, .job-search-card__title').text().trim();
                    const company = $element.find('.base-search-card__subtitle, .job-search-card__company').text().trim();
                    const location = $element.find('.job-search-card__location, .job-search-card__metadata__item').text().trim();
                    const time = $element.find('.job-search-card__listdate, time').text().trim();
                    const link = $element.find('a.base-card__full-link, a.job-search-card__link').attr('href');
                    
                    // Filtrar apenas vagas relevantes
                    if (title && this.isRelevantJob(title)) {
                        const job = {
                            title: title,
                            company: company || 'Não informado',
                            location: location || 'Remoto',
                            time: time || 'Não informado',
                            link: link ? (link.startsWith('http') ? link : `https://www.linkedin.com${link}`) : 'Não disponível',
                            remote: this.isRemoteJob(title, location),
                            senior: this.isSeniorLevel(title),
                            scrapedAt: new Date().toLocaleString('pt-BR')
                        };
                        
                        jobs.push(job);
                    }
                } catch (error) {
                    console.error('Erro ao extrair vaga:', error);
                }
            });

            return jobs;

        } catch (error) {
            console.error('Erro ao extrair vagas da página:', error);
            return [];
        }
    }

    isRelevantJob(title) {
        const keywords = [
            'analista de sistemas',
            'systems analyst',
            'analista sistemas',
            'analista sênior',
            'senior analyst'
        ];
        
        const lowerTitle = title.toLowerCase();
        return keywords.some(keyword => lowerTitle.includes(keyword));
    }

    isRemoteJob(title, location) {
        const remoteKeywords = ['remote', 'remoto', 'remota', 'home office', 'teletrabalho'];
        const lowerTitle = title.toLowerCase();
        const lowerLocation = location.toLowerCase();
        
        return remoteKeywords.some(keyword => 
            lowerTitle.includes(keyword) || lowerLocation.includes(keyword)
        );
    }

    isSeniorLevel(title) {
        const seniorKeywords = ['sênior', 'senior', 'sr.', 'sr', 'pleno', 'experiente'];
        const lowerTitle = title.toLowerCase();
        
        return seniorKeywords.some(keyword => lowerTitle.includes(keyword));
    }

    async goToNextPage() {
        try {
            // Tentar encontrar e clicar no botão próxima página
            const nextButton = await this.page.$('button[aria-label="Avançar"], button[aria-label="Next"]');
            
            if (nextButton) {
                const isDisabled = await this.page.evaluate(button => {
                    return button.disabled || button.getAttribute('aria-disabled') === 'true';
                }, nextButton);
                
                if (!isDisabled) {
                    await nextButton.click();
                    await this.delay(3000);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Erro ao navegar para próxima página:', error);
            return false;
        }
    }

    removeDuplicates(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            const key = `${job.title}-${job.company}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    async saveToCSV(filename = 'vagas_remotas_senior.csv') {
        const csvWriter = createCsvWriter({
            path: filename,
            header: [
                {id: 'title', title: 'Cargo'},
                {id: 'company', title: 'Empresa'},
                {id: 'location', title: 'Localização'},
                {id: 'time', title: 'Data/Período'},
                {id: 'link', title: 'Link da Vaga'},
                {id: 'remote', title: 'Remoto'},
                {id: 'senior', title: 'Nível Sênior'},
                {id: 'scrapedAt', title: 'Data da Coleta'}
            ],
            encoding: 'utf8'
        });

        await csvWriter.writeRecords(this.jobs);
        console.log(`\n💾 Vagas salvas em: ${filename}`);
    }

    async saveToJSON(filename = 'vagas_remotas_senior.json') {
        fs.writeFileSync(filename, JSON.stringify(this.jobs, null, 2), 'utf8');
        console.log(`💾 Vagas salvas em: ${filename}`);
    }

    displayResults() {
        console.log('\n📊 RESUMO DAS VAGAS ENCONTRADAS:\n');
        console.log('=' .repeat(80));
        
        this.jobs.forEach((job, index) => {
            console.log(`\n${index + 1}. ${job.title}`);
            console.log(`   Empresa: ${job.company}`);
            console.log(`   Local: ${job.location}`);
            console.log(`   Remoto: ${job.remote ? '✅' : '❌'}`);
            console.log(`   Sênior: ${job.senior ? '✅' : '❌'}`);
            console.log(`   Link: ${job.link}`);
            console.log(`   Publicada: ${job.time}`);
            console.log('-'.repeat(60));
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Função de execução principal
async function main() {
    const scraper = new LinkedInJobsScraper();
    
    try {
        console.log('🚀 Iniciando busca por vagas remotas de Analista de Sistemas Sênior...\n');
        
        await scraper.init();
        
        // Buscar vagas (máximo 3 páginas para evitar bloqueio)
        const jobs = await scraper.searchRemoteSeniorSystemsAnalystJobs(3);
        
        if (jobs.length > 0) {
            // Mostrar resultados no console
            scraper.displayResults();
            
            // Salvar resultados
            await scraper.saveToCSV();
            await scraper.saveToJSON();
            
            console.log(`\n✅ Busca concluída! ${jobs.length} vagas encontradas e salvas.`);
        } else {
            console.log('\n❌ Nenhuma vaga encontrada. Tente ajustar os parâmetros de busca.');
        }
        
    } catch (error) {
        console.error('❌ Erro na execução:', error);
    } finally {
        await scraper.close();
    }
}

// Executar diretamente ou exportar para uso em outros módulos
if (require.main === module) {
    main();
}

module.exports = LinkedInJobsScraper;
