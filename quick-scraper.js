const puppeteer = require('puppeteer');

async function quickLinkedInJobsSearch() {
    console.log('🔍 Buscando vagas remotas de Analista de Sistemas Sênior...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // URL otimizada para busca
        const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=Analista%20de%20Sistemas%20S%C3%AAnior%20Remoto&location=Brasil&f_WT=2&f_E=4';
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(5000);

        const jobs = await page.evaluate(() => {
            const jobElements = Array.from(document.querySelectorAll('.jobs-search__results-list li, [data-entity-urn*="jobPosting"]'));
            
            return jobElements.map(element => {
                const titleElem = element.querySelector('.base-search-card__title, .job-search-card__title');
                const companyElem = element.querySelector('.base-search-card__subtitle, .job-search-card__company');
                const locationElem = element.querySelector('.job-search-card__location');
                const linkElem = element.querySelector('a.base-card__full-link, a.job-search-card__link');
                
                return {
                    title: titleElem ? titleElem.textContent.trim() : '',
                    company: companyElem ? companyElem.textContent.trim() : '',
                    location: locationElem ? locationElem.textContent.trim() : '',
                    link: linkElem ? linkElem.href : '',
                    remote: element.textContent.toLowerCase().includes('remote') || element.textContent.toLowerCase().includes('remoto')
                };
            }).filter(job => 
                job.title && 
                job.title.toLowerCase().includes('analista') && 
                job.title.toLowerCase().includes('sistemas')
            );
        });

        console.log(`\n✅ Encontradas ${jobs.length} vagas:`);
        jobs.forEach((job, index) => {
            console.log(`\n${index + 1}. ${job.title}`);
            console.log(`   Empresa: ${job.company}`);
            console.log(`   Local: ${job.location}`);
            console.log(`   Remoto: ${job.remote ? '✅' : '❌'}`);
            console.log(`   Link: ${job.link}`);
        });

        return jobs;

    } catch (error) {
        console.error('❌ Erro:', error);
        return [];
    } finally {
        await browser.close();
    }
}

// Executar
quickLinkedInJobsSearch();
